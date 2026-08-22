import hashlib
import hmac
import json
import logging
import os
import re
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import SECRET_KEY, get_current_user
from app.database import get_db
from app.models import AuditLog, Category, CollectionRequest, Payout, SupportMessage, SupportTicket, User
from app.routers.consumer import _get_owned_request, _request_query
from app.schemas import CollectionRequestCreate, RequestItemCreate
from app.services.consumer_requests import cancel_collection_request, create_collection_request, update_collection_request
from app.utils import log_audit

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)


class ChatHistoryMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=8000)


class ConfirmedAction(BaseModel):
    name: str
    arguments: dict[str, Any]
    confirmation_token: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: str | None = Field(default=None, max_length=100)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=20)
    confirmed_action: ConfirmedAction | None = None


class CreateOrderInput(BaseModel):
    address_id: int
    request_type: str
    notes: str | None = None
    items: list[RequestItemCreate] = Field(min_length=1)


class UpdateOrderInput(BaseModel):
    request_id: int
    address_id: int | None = None
    request_type: str | None = None
    notes: str | None = None
    items: list[RequestItemCreate] | None = None


class OrderActionInput(BaseModel):
    request_id: int


class CreateSupportTicketInput(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=5)
    request_id: int | None = None


class UpdateSupportTicketInput(BaseModel):
    ticket_id: int
    message: str = Field(min_length=1)


KB_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base.md")
with open(KB_PATH, "r", encoding="utf-8") as knowledge_file:
    knowledge_base = knowledge_file.read()

def get_system_prompt(user_role: str) -> str:
    if user_role == "CONSUMER":
        role_instructions = (
            "The current user role is CONSUMER.\n"
            "Consumers have access to tools to view and manage their saved addresses, create/update/cancel pickup orders, check recycling impact, view earnings, and manage support tickets.\n"
            "You can assist consumers with both general platform information and their personal pickup orders, addresses, earnings, impact, and support tickets."
        )
    else:
        role_instructions = (
            f"The current user category is {user_role}.\n"
            "This user category (non-consumer: partner, segregation centre, admin) DOES NOT HAVE access to personal pickup order or address management tools.\n"
            "You MUST ONLY display and provide generic information about the Reloop application and platform (such as company mission, operating cities, e-waste collection process, base pricing estimates, data privacy guidelines, and FAQs).\n"
            "DO NOT offer, list, or claim features related to scheduling or managing pickup orders, adding or viewing saved addresses, or modifying orders. "
            "If asked what you can do or how you can help, display ONLY generic information about the Reloop application suitable for non-consumer users."
        )

    return f"""
You are the official Reloop E-waste Platform AI Assistant.
Use the knowledge base for general questions and tools for user-specific information.
Never invent order IDs, addresses, categories, prices, statuses, or availability.

--- USER CATEGORY GUIDANCE ---
{role_instructions}

Never create an order without explicit user confirmation. The create_pickup_order tool
only prepares a preview; the server creates the order after a separate confirmation.
Before creating an order, ask the user to choose one of their saved addresses and either
standard (NORMAL) or priority (PRIORITY) pickup. Do not assume a default for either choice.
Always ask for confirmation before cancelling, removing, or updating an order, or
creating or updating a support ticket. Removing an order means cancelling it while
preserving its history; never hard-delete orders. Updating a support ticket means
adding a follow-up message; only staff can change ticket status.
Bulk address, order, and support-ticket tools return at most 3 records. When a bulk tool
reports has_more=true, show the returned records and ask whether the user wants the next
3 records before calling that tool again with its next_offset. Do not fetch more automatically.
Never mention tool names, function names, argument names, JSON keys, offsets, or internal
variables in a user-facing reply. Translate all tool results into natural human language;
for example, say "Would you like me to show the next 3 orders?" rather than exposing
technical pagination details or naming a tool.
Keep answers concise, friendly, and clear. Treat tool results as authoritative.
Do not reveal private data such as passwords, tokens, UPI IDs, or pickup OTPs.

--- KNOWLEDGE BASE ---
{knowledge_base}
"""



def _secret() -> bytes:
    return SECRET_KEY.encode("utf-8")


def _action_token(user_id: int, arguments: dict[str, Any]) -> str:
    payload = {"user_id": user_id, "arguments": arguments, "expires": int(time.time()) + 600}
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(_secret(), encoded, hashlib.sha256).hexdigest()
    return f"{encoded.hex()}.{signature}"


def _verify_action_token(user_id: int, arguments: dict[str, Any], token: str) -> bool:
    try:
        encoded_hex, signature = token.split(".", 1)
        encoded = bytes.fromhex(encoded_hex)
        expected = hmac.new(_secret(), encoded, hashlib.sha256).hexdigest()
        payload = json.loads(encoded)
        return hmac.compare_digest(signature, expected) and payload["user_id"] == user_id and payload["arguments"] == arguments and payload["expires"] >= int(time.time())
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return False


def _token_fingerprint(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _pending_action(name: str, arguments: dict[str, Any], user_id: int, preview: dict[str, Any]) -> str:
    return json.dumps({
        "pending_action": {"name": name, "arguments": arguments, "confirmation_token": _action_token(user_id, arguments)},
        "preview": preview,
    })


def _request_summary(request: Any) -> dict[str, Any]:
    return {
        "id": request.id,
        "status": request.status,
        "request_type": request.request_type,
        "created_at": request.created_at.isoformat(),
        "updated_at": request.updated_at.isoformat(),
        "pickup_city": request.pickup_city,
        "notes": request.notes,
        "items": [{
            "category": item.category.name if item.category else None,
            "quantity": item.quantity,
            "estimated_weight_kg": item.estimated_weight_kg,
            "actual_weight_kg": item.actual_weight_kg,
            "weight_kg": item.actual_weight_kg if item.actual_weight_kg is not None else item.estimated_weight_kg,
            "weight_type": "actual" if item.actual_weight_kg is not None else "estimate",
        } for item in request.items],
        "quote": ({"material_value": request.quotation.material_value, "handling_charge": request.quotation.handling_charge, "pickup_charge": request.quotation.pickup_charge, "total_amount": request.quotation.total_amount, "status": request.quotation.status} if request.quotation else None),
        "latest_status": request.history[-1].status if request.history else request.status,
    }


def _make_tools(db: Session, user: User):
    @tool("list_my_addresses")
    def list_my_addresses(offset: int = 0) -> str:
        """List up to 3 saved pickup addresses, starting at offset."""
        offset = max(0, offset)
        addresses = list(user.addresses)
        page = addresses[offset:offset + 3]
        return json.dumps({
            "addresses": [{"id": address.id, "label": address.label, "street": address.street, "city": address.city, "state": address.state, "pincode": address.pincode, "is_default": address.is_default} for address in page],
            "has_more": offset + len(page) < len(addresses),
            "next_offset": offset + len(page),
        })

    @tool("list_available_categories")
    def list_available_categories() -> str:
        """List active e-waste categories and estimate prices."""
        categories = db.query(Category).filter(Category.is_active.is_(True)).order_by(Category.name).all()
        return json.dumps([{"id": category.id, "name": category.name, "base_price_per_kg": category.base_price_per_kg} for category in categories])

    @tool("list_my_orders")
    def list_my_orders(status: str | None = None, offset: int = 0) -> str:
        """List up to 3 recent orders, starting at offset, belonging to the authenticated consumer."""
        offset = max(0, offset)
        query = _request_query(db).filter(CollectionRequest.consumer_id == user.id)
        if status:
            query = query.filter(CollectionRequest.status == status.upper())
        orders = query.order_by(CollectionRequest.created_at.desc()).offset(offset).limit(4).all()
        page = orders[:3]
        return json.dumps({
            "orders": [_request_summary(order) for order in page],
            "has_more": len(orders) > 3,
            "next_offset": offset + len(page),
        })

    @tool("get_my_order")
    def get_my_order(request_id: int) -> str:
        """Retrieve one order owned by the authenticated consumer."""
        try:
            request = _get_owned_request(db, request_id, user.id)
        except HTTPException:
            return json.dumps({"error": "Order not found."})
        return json.dumps(_request_summary(request))

    @tool("get_my_impact")
    def get_my_impact() -> str:
        """Return the authenticated consumer's completed recycling impact."""
        completed = _request_query(db).filter(CollectionRequest.consumer_id == user.id, CollectionRequest.status == "COMPLETED").all()
        total_weight = 0.0
        total_co2 = 0.0
        item_count = 0
        for request in completed:
            for item in request.items:
                weight = item.actual_weight_kg or item.estimated_weight_kg
                factor = item.category.co2_factor_kg if item.category else 1.5
                total_weight += weight * item.quantity
                total_co2 += weight * item.quantity * factor
                item_count += item.quantity
        return json.dumps({"total_weight_kg": round(total_weight, 2), "total_co2_saved_kg": round(total_co2, 2), "total_requests_completed": len(completed), "total_items_recycled": item_count})

    @tool("get_my_earnings")
    def get_my_earnings() -> str:
        """Return consumer payout totals and recent payout statuses."""
        payouts = db.query(Payout).filter(Payout.user_id == user.id, Payout.payout_type == "CONSUMER").order_by(Payout.created_at.desc()).limit(20).all()
        return json.dumps({
            "total_paid_or_collected": round(sum(p.amount for p in payouts if p.status in {"SUCCESS", "CASH_COLLECTED"}), 2),
            "pending_amount": round(sum(p.amount for p in payouts if p.status in {"PENDING", "PROCESSING"}), 2),
            "failed_amount": round(sum(p.amount for p in payouts if p.status in {"FAILED", "REJECTED", "ERROR"}), 2),
            "payouts": [{"id": p.id, "request_id": p.request_id, "amount": p.amount, "status": p.status, "created_at": p.created_at.isoformat()} for p in payouts],
        })

    @tool("list_my_support_tickets")
    def list_my_support_tickets(offset: int = 0) -> str:
        """List up to 3 support tickets, starting at offset, belonging to the authenticated consumer."""
        offset = max(0, offset)
        tickets = db.query(SupportTicket).filter(SupportTicket.user_id == user.id).order_by(SupportTicket.created_at.desc()).offset(offset).limit(4).all()
        page = tickets[:3]
        return json.dumps({
            "tickets": [{"id": ticket.id, "subject": ticket.subject, "status": ticket.status, "request_id": ticket.request_id, "created_at": ticket.created_at.isoformat()} for ticket in page],
            "has_more": len(tickets) > 3,
            "next_offset": offset + len(page),
        })

    @tool("summarize_my_support_tickets")
    def summarize_my_support_tickets() -> str:
        """Summarize the authenticated consumer's support tickets by status."""
        tickets = db.query(SupportTicket).filter(SupportTicket.user_id == user.id).all()
        by_status = {}
        for ticket in tickets:
            by_status[ticket.status] = by_status.get(ticket.status, 0) + 1
        return json.dumps({"total": len(tickets), "by_status": by_status, "latest": [{"id": t.id, "subject": t.subject, "status": t.status} for t in sorted(tickets, key=lambda item: item.created_at, reverse=True)[:5]]})

    @tool("create_pickup_order", args_schema=CreateOrderInput)
    def create_pickup_order(address_id: int, request_type: str, notes: str | None = None, items: list[RequestItemCreate] | None = None) -> str:
        """Validate and preview a pickup order; this never creates the order."""
        payload = CollectionRequestCreate(address_id=address_id, request_type=request_type, notes=notes, items=items or [])
        address = next((item for item in user.addresses if item.id == address_id), None)
        if not address:
            return json.dumps({"error": "Address not found. Ask the user to choose one of their saved addresses."})
        for item in payload.items:
            category = db.get(Category, item.category_id)
            if not category or not category.is_active:
                return json.dumps({"error": f"Category {item.category_id} is not available."})
        arguments = payload.model_dump(mode="json")
        return _pending_action("create_pickup_order", arguments, user.id, {"operation": "create", "address": {"label": address.label, "city": address.city, "street": address.street}, "request_type": payload.request_type, "notes": payload.notes, "items": [{"category_id": item.category_id, "quantity": item.quantity, "estimated_weight_kg": item.estimated_weight_kg, "weight_kg": item.estimated_weight_kg, "weight_type": "estimate"} for item in payload.items]})

    @tool("update_order", args_schema=UpdateOrderInput)
    def update_order(request_id: int, address_id: int | None = None, request_type: str | None = None, notes: str | None = None, items: list[RequestItemCreate] | None = None) -> str:
        """Prepare an update for a pending or quoted order; this never updates without confirmation."""
        request = _get_owned_request(db, request_id, user.id)
        arguments = UpdateOrderInput(request_id=request_id, address_id=address_id, request_type=request_type, notes=notes, items=items).model_dump(mode="json", exclude_unset=True)
        return _pending_action("update_order", arguments, user.id, {"operation": "update", "order": _request_summary(request), "changes": arguments})

    @tool("cancel_order", args_schema=OrderActionInput)
    def cancel_order(request_id: int) -> str:
        """Prepare cancellation of a pending or quoted order; this never cancels without confirmation."""
        request = _get_owned_request(db, request_id, user.id)
        arguments = {"request_id": request_id}
        return _pending_action("cancel_order", arguments, user.id, {"operation": "cancel", "order": _request_summary(request)})

    @tool("remove_order", args_schema=OrderActionInput)
    def remove_order(request_id: int) -> str:
        """Prepare a soft removal, which cancels an eligible order and preserves its history."""
        request = _get_owned_request(db, request_id, user.id)
        arguments = {"request_id": request_id}
        return _pending_action("remove_order", arguments, user.id, {"operation": "remove", "note": "The order will be cancelled and retained in history.", "order": _request_summary(request)})

    @tool("create_support_ticket", args_schema=CreateSupportTicketInput)
    def create_support_ticket(subject: str, message: str, request_id: int | None = None) -> str:
        """Prepare a new support ticket; it is created only after confirmation."""
        if request_id is not None:
            _get_owned_request(db, request_id, user.id)
        arguments = CreateSupportTicketInput(subject=subject, message=message, request_id=request_id).model_dump(mode="json")
        return _pending_action("create_support_ticket", arguments, user.id, {"operation": "create support ticket", "subject": subject, "message": message, "request_id": request_id})

    @tool("update_support_ticket", args_schema=UpdateSupportTicketInput)
    def update_support_ticket(ticket_id: int, message: str) -> str:
        """Prepare a follow-up message for the consumer's support ticket."""
        ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id, SupportTicket.user_id == user.id).first()
        if not ticket:
            return json.dumps({"error": "Support ticket not found."})
        arguments = {"ticket_id": ticket_id, "message": message}
        return _pending_action("update_support_ticket", arguments, user.id, {"operation": "add support message", "ticket_id": ticket_id, "subject": ticket.subject, "message": message})

    return [list_my_addresses, list_available_categories, list_my_orders, get_my_order, get_my_impact, get_my_earnings, list_my_support_tickets, summarize_my_support_tickets, create_pickup_order, update_order, cancel_order, remove_order, create_support_ticket, update_support_ticket]


def _content(response: Any) -> str:
    if isinstance(response, str):
        return response
    if isinstance(response, list):
        return " ".join(str(part.get("text", "")) if isinstance(part, dict) else str(part) for part in response)
    return str(response)


def _user_reply(response: Any) -> str:
    """Remove implementation terms if the model echoes them in its reply."""
    reply = _content(response)
    replacements = {
        "list_available_categories": "available categories",
        "list_my_addresses": "saved addresses",
        "list_my_orders": "orders",
        "list_my_support_tickets": "support tickets",
        "get_my_order": "order details",
        "get_my_impact": "recycling impact",
        "get_my_earnings": "earnings",
        "create_pickup_order": "pickup order",
        "update_order": "order update",
        "cancel_order": "order cancellation",
        "remove_order": "order removal",
        "create_support_ticket": "support ticket",
        "update_support_ticket": "support ticket update",
        "has_more=true": "more results are available",
        "has_more": "more results",
        "next_offset": "next page",
        "pending_action": "requested action",
        "pending_preview": "confirmation details",
    }
    for internal_term, human_term in replacements.items():
        reply = re.sub(re.escape(internal_term), human_term, reply, flags=re.IGNORECASE)
    return reply


@router.post("")
def chat_with_bot(req: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if req.confirmed_action:
        if user.role != "CONSUMER":
            raise HTTPException(status_code=403, detail="Only consumers can confirm assistant actions.")
        action = req.confirmed_action
        allowed_actions = {"create_pickup_order", "update_order", "cancel_order", "remove_order", "create_support_ticket", "update_support_ticket"}
        if action.name not in allowed_actions or not _verify_action_token(user.id, action.arguments, action.confirmation_token):
            raise HTTPException(status_code=400, detail="This confirmation has expired or is invalid.")
        fingerprint = _token_fingerprint(action.confirmation_token)
        if db.query(AuditLog).filter(AuditLog.action == "AI_ORDER_CONFIRMATION_USED", AuditLog.details == fingerprint).first():
            raise HTTPException(status_code=400, detail="This pickup order confirmation has already been used.")
        try:
            if action.name == "create_pickup_order":
                request = create_collection_request(db, CollectionRequestCreate.model_validate(action.arguments), user)
                result = {"reply": f"Pickup order #{request.id} was placed successfully.", "created_request_id": request.id, "data": _request_summary(_get_owned_request(db, request.id, user.id))}
            elif action.name == "update_order":
                update_data = UpdateOrderInput.model_validate(action.arguments)
                request = _get_owned_request(db, update_data.request_id, user.id)
                update_collection_request(db, request, user, address_id=update_data.address_id, request_type=update_data.request_type, notes=update_data.notes, items=update_data.items)
                result = {"reply": f"Order #{request.id} was updated successfully.", "data": _request_summary(_get_owned_request(db, request.id, user.id))}
            elif action.name in {"cancel_order", "remove_order"}:
                request = cancel_collection_request(db, _get_owned_request(db, action.arguments["request_id"], user.id), user)
                result = {"reply": f"Order #{request.id} was cancelled and retained in your history.", "data": _request_summary(_get_owned_request(db, request.id, user.id))}
            elif action.name == "create_support_ticket":
                request_id = action.arguments.get("request_id")
                if request_id is not None:
                    _get_owned_request(db, request_id, user.id)
                ticket = SupportTicket(user_id=user.id, subject=action.arguments["subject"], message=action.arguments["message"], request_id=request_id)
                db.add(ticket)
                db.commit()
                result = {"reply": f"Support ticket #{ticket.id} was created.", "ticket_id": ticket.id}
            else:
                ticket = db.query(SupportTicket).filter(SupportTicket.id == action.arguments["ticket_id"], SupportTicket.user_id == user.id).first()
                if not ticket:
                    raise HTTPException(status_code=404, detail="Support ticket not found.")
                db.add(SupportMessage(ticket_id=ticket.id, sender_id=user.id, message=action.arguments["message"]))
                db.commit()
                result = {"reply": f"Your message was added to support ticket #{ticket.id}.", "ticket_id": ticket.id}
        except KeyError as error:
            raise HTTPException(status_code=400, detail="The confirmed assistant action is incomplete.") from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail="The confirmed assistant action is invalid.") from error
        log_audit(db, user.id, "AI_ORDER_CONFIRMATION_USED", fingerprint)
        db.commit()
        return result

    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is not set in the environment.")
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
    try:
        tools = _make_tools(db, user) if user.role == "CONSUMER" else []
        llm = ChatGoogleGenerativeAI(model=model, google_api_key=api_key, temperature=0.2)
        if tools:
            llm = llm.bind_tools(tools)
        messages = [SystemMessage(content=get_system_prompt(user.role))]
        for history_message in req.history[-20:]:
            messages.append(HumanMessage(content=history_message.content) if history_message.role == "user" else AIMessage(content=history_message.content))
        messages.append(HumanMessage(content=req.message))
        pending_action = None
        pending_preview = None
        response = None
        for _ in range(4):
            response = llm.invoke(messages)
            messages.append(response)
            if not response.tool_calls:
                break
            for call in response.tool_calls:
                selected_tool = next((item for item in tools if item.name == call.get("name")), None)
                if selected_tool is None:
                    result = json.dumps({"error": "The requested assistant operation is unavailable."})
                else:
                    try:
                        result = selected_tool.invoke(call.get("args", {}))
                    except Exception as error:
                        logger.exception("Gemini tool failed: tool=%s error_type=%s", call.get("name"), type(error).__name__)
                        result = json.dumps({"error": "That assistant operation could not be completed."})
                try:
                    parsed = json.loads(result)
                    if isinstance(parsed, dict):
                        pending_action = parsed.get("pending_action") or pending_action
                        pending_preview = parsed.get("preview") or pending_preview
                except (json.JSONDecodeError, TypeError):
                    pass
                messages.append(ToolMessage(content=result, tool_call_id=call["id"]))
        return {"reply": _user_reply(response.content), "pending_action": pending_action, "pending_preview": pending_preview}
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Gemini request failed: model=%s key_configured=%s error_type=%s", model, bool(api_key), type(error).__name__)
        raise HTTPException(status_code=502, detail="The AI assistant is temporarily unavailable. Please try again.")
