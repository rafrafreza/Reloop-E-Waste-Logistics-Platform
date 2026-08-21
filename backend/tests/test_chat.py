import json
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.models import CollectionRequest, RequestItem, SupportTicket, User
from app.routers.chat import _make_tools


def test_chat_requires_authentication(client):
    response = client.post("/api/chat", json={"message": "What is e-waste?"})
    assert response.status_code == 401


def test_chat_requires_google_key(client, consumer_headers, monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    response = client.post("/api/chat", json={"message": "What is e-waste?"}, headers=consumer_headers)
    assert response.status_code == 500
    assert "GOOGLE_API_KEY" in response.json()["detail"]


def test_order_tools_are_scoped_to_current_consumer(db_session, consumer_headers, consumer_address, category):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    tools = _make_tools(db_session, user)
    addresses = json.loads(tools[0].invoke({}))
    categories = json.loads(tools[1].invoke({}))
    assert addresses["addresses"][0]["id"] == consumer_address["id"]
    assert addresses["has_more"] is False
    assert categories[0]["id"] == category["id"]


def test_get_order_tool_hides_other_consumer_orders(db_session, collection_request):
    other = User(email="other@test.com", hashed_password="not-used", full_name="Other", role="CONSUMER", is_active=True)
    db_session.add(other)
    db_session.commit()
    db_session.query(CollectionRequest).filter(CollectionRequest.id == collection_request["id"]).update({"consumer_id": other.id})
    db_session.commit()
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    get_order = _make_tools(db_session, user)[3]
    result = json.loads(get_order.invoke({"request_id": collection_request["id"]}))
    assert result == {"error": "Order not found."}


def test_order_summary_prefers_actual_weight_when_available(db_session, collection_request, category):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    request = db_session.get(CollectionRequest, collection_request["id"])
    request.items[0].actual_weight_kg = 0.8
    request.items.append(RequestItem(category_id=category["id"], estimated_weight_kg=1.2, quantity=1))
    db_session.commit()

    get_order = next(tool for tool in _make_tools(db_session, user) if tool.name == "get_my_order")
    items = json.loads(get_order.invoke({"request_id": request.id}))["items"]

    assert items[0]["weight_kg"] == 0.8
    assert items[0]["weight_type"] == "actual"
    assert items[1]["weight_kg"] == 1.2
    assert items[1]["weight_type"] == "estimate"


def test_create_order_preview_does_not_mutate_and_confirmation_creates_order(client, consumer_headers, consumer_address, category, db_session):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    create_order = next(tool for tool in _make_tools(db_session, user) if tool.name == "create_pickup_order")
    arguments = {
        "address_id": consumer_address["id"],
        "request_type": "NORMAL",
        "notes": "Please call first",
        "items": [{"category_id": category["id"], "quantity": 1, "estimated_weight_kg": 1.5}],
    }
    before = db_session.query(CollectionRequest).count()
    preview = json.loads(create_order.invoke(arguments))
    assert "pending_action" in preview
    assert db_session.query(CollectionRequest).count() == before

    response = client.post("/api/chat", json={"message": "Confirm", "confirmed_action": preview["pending_action"]}, headers=consumer_headers)
    assert response.status_code == 200
    assert response.json()["created_request_id"]
    assert db_session.query(CollectionRequest).count() == before + 1

    duplicate = client.post("/api/chat", json={"message": "Confirm again", "confirmed_action": preview["pending_action"]}, headers=consumer_headers)
    assert duplicate.status_code == 400
    assert db_session.query(CollectionRequest).count() == before + 1


def test_create_order_requires_explicit_pickup_type(db_session, consumer_address, category):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    create_order = next(tool for tool in _make_tools(db_session, user) if tool.name == "create_pickup_order")
    with pytest.raises(ValidationError, match="request_type"):
        create_order.invoke({
            "address_id": consumer_address["id"],
            "items": [{"category_id": category["id"], "quantity": 1, "estimated_weight_kg": 1.5}],
        })


def test_invalid_confirmation_is_rejected(client, consumer_headers):
    response = client.post("/api/chat", json={"message": "Confirm", "confirmed_action": {"name": "create_pickup_order", "arguments": {}, "confirmation_token": "invalid"}}, headers=consumer_headers)
    assert response.status_code == 400


def test_cancel_order_preview_and_confirmation(client, consumer_headers, collection_request, db_session):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    cancel_order = next(tool for tool in _make_tools(db_session, user) if tool.name == "cancel_order")
    preview = json.loads(cancel_order.invoke({"request_id": collection_request["id"]}))
    response = client.post("/api/chat", json={"message": "Confirm cancellation", "confirmed_action": preview["pending_action"]}, headers=consumer_headers)
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "CANCELLED"


def test_support_ticket_preview_and_confirmation(client, consumer_headers, db_session):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    create_ticket = next(tool for tool in _make_tools(db_session, user) if tool.name == "create_support_ticket")
    preview = json.loads(create_ticket.invoke({"subject": "Pickup question", "message": "Please help with my pickup."}))
    response = client.post("/api/chat", json={"message": "Confirm ticket", "confirmed_action": preview["pending_action"]}, headers=consumer_headers)
    assert response.status_code == 200
    assert response.json()["ticket_id"]


def test_update_order_preview_and_confirmation(client, consumer_headers, collection_request, category, db_session):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    update_order = next(tool for tool in _make_tools(db_session, user) if tool.name == "update_order")
    preview = json.loads(update_order.invoke({"request_id": collection_request["id"], "notes": "Updated pickup note"}))
    response = client.post("/api/chat", json={"message": "Confirm update", "confirmed_action": preview["pending_action"]}, headers=consumer_headers)
    assert response.status_code == 200
    assert response.json()["data"]["notes"] == "Updated pickup note"


def test_support_ticket_update_and_summary_tools(client, consumer_headers, db_session):
    user = db_session.query(User).filter(User.email == "consumer@test.com").one()
    create_ticket = next(tool for tool in _make_tools(db_session, user) if tool.name == "create_support_ticket")
    preview = json.loads(create_ticket.invoke({"subject": "Follow up", "message": "Need a status update."}))
    client.post("/api/chat", json={"message": "Confirm ticket", "confirmed_action": preview["pending_action"]}, headers=consumer_headers)
    ticket = db_session.query(SupportTicket).filter(SupportTicket.user_id == user.id).first()
    update_ticket = next(tool for tool in _make_tools(db_session, user) if tool.name == "update_support_ticket")
    update_preview = json.loads(update_ticket.invoke({"ticket_id": ticket.id, "message": "Adding more details."}))
    response = client.post("/api/chat", json={"message": "Confirm message", "confirmed_action": update_preview["pending_action"]}, headers=consumer_headers)
    assert response.status_code == 200
    summary = json.loads(next(tool for tool in _make_tools(db_session, user) if tool.name == "summarize_my_support_tickets").invoke({}))
    assert summary["total"] == 1