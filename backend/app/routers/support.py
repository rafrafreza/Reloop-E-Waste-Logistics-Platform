from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import CollectionRequest, SupportTicket, SupportMessage, User
from app.schemas import SupportTicketCreate, SupportTicketOut, SupportMessageOut, SupportMessageCreate

router = APIRouter(prefix="/api/support", tags=["support"])


def _ticket_out(t: SupportTicket) -> SupportTicketOut:
    msgs = []
    if getattr(t, "messages", None):
        msgs = [SupportMessageOut(
            id=m.id, sender_id=m.sender_id, sender_name=m.sender.full_name if getattr(m, "sender", None) else None,
            sender_role=m.sender.role if getattr(m, "sender", None) else None, message=m.message, created_at=m.created_at
        ) for m in t.messages]
    
    return SupportTicketOut(
        id=t.id, user_id=t.user_id, user_name=t.user.full_name if t.user else None,
        user_role=t.user.role if t.user else None, request_id=t.request_id, subject=t.subject,
        message=t.message, status=t.status, messages=msgs,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.post("/tickets", response_model=SupportTicketOut, status_code=201)
def create_ticket(payload: SupportTicketCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.request_id is not None:
        req = db.get(CollectionRequest, payload.request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")

    ticket = SupportTicket(
        user_id=user.id, request_id=payload.request_id, subject=payload.subject, message=payload.message,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    ticket = db.query(SupportTicket).options(joinedload(SupportTicket.user)).filter(SupportTicket.id == ticket.id).first()
    return _ticket_out(ticket)


@router.get("/tickets", response_model=list[SupportTicketOut])
def list_my_tickets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tickets = (
        db.query(SupportTicket)
        .options(
            joinedload(SupportTicket.user),
            joinedload(SupportTicket.messages).joinedload(SupportMessage.sender)
        )
        .filter(SupportTicket.user_id == user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [_ticket_out(t) for t in tickets]


@router.get("/tickets/{ticket_id}", response_model=SupportTicketOut)
def get_my_ticket(ticket_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = (
        db.query(SupportTicket)
        .options(
            joinedload(SupportTicket.user),
            joinedload(SupportTicket.messages).joinedload(SupportMessage.sender)
        )
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket or (ticket.user_id != user.id and user.role != "ADMIN"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_out(ticket)

@router.post("/tickets/{ticket_id}/messages", response_model=SupportTicketOut)
def add_message(ticket_id: int, payload: SupportMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ticket = (
        db.query(SupportTicket)
        .options(
            joinedload(SupportTicket.user),
            joinedload(SupportTicket.messages).joinedload(SupportMessage.sender)
        )
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket or (ticket.user_id != user.id and user.role != "ADMIN"):
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    msg = SupportMessage(ticket_id=ticket.id, sender_id=user.id, message=payload.message)
    db.add(msg)
    
    from app.utils import notify
    notif_payload = None
    if user.role == "ADMIN":
        notif_payload = notify(db, ticket.user_id, "New support message", f"Admin replied to your ticket: {ticket.subject}", link=f"/{ticket.user.role.lower()}/support")
    else:
        # We don't notify all admins individually, but this could trigger a general admin broadcast if needed
        pass
        
    db.commit()
    if notif_payload:
        from app.websocket import manager
        manager.push_sync(notif_payload["user_id"], notif_payload)
        
    db.refresh(ticket)
    return _ticket_out(ticket)
