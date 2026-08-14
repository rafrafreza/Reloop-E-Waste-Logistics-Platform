import pytest
from app.models import SupportTicket

def test_create_support_ticket(client, consumer_headers):
    resp = client.post("/api/support/tickets", json={
        "subject": "App crashing",
        "message": "The app crashes when I try to accept a quote"
    }, headers=consumer_headers)
    
    assert resp.status_code == 201
    data = resp.json()
    assert data["subject"] == "App crashing"
    assert data["message"] == "The app crashes when I try to accept a quote"
    assert data["status"] == "OPEN"
    assert data["request_id"] is None

def test_create_ticket_with_request_id(client, consumer_headers, collection_request):
    req_id = collection_request["id"]
    resp = client.post("/api/support/tickets", json={
        "request_id": req_id,
        "subject": "Pickup delayed",
        "message": "The partner hasn't arrived yet"
    }, headers=consumer_headers)
    
    assert resp.status_code == 201
    data = resp.json()
    assert data["request_id"] == req_id
    assert data["subject"] == "Pickup delayed"

def test_create_ticket_invalid_request_id(client, consumer_headers):
    resp = client.post("/api/support/tickets", json={
        "request_id": 999999,
        "subject": "Invalid request id",
        "message": "This should fail"
    }, headers=consumer_headers)
    
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Request not found"

def test_list_my_tickets(client, consumer_headers, db_session):
    client.post("/api/support/tickets", json={
        "subject": "Ticket 1", "message": "msg 1"
    }, headers=consumer_headers)
    client.post("/api/support/tickets", json={
        "subject": "Ticket 2", "message": "msg 2"
    }, headers=consumer_headers)
    
    resp = client.get("/api/support/tickets", headers=consumer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["subject"] == "Ticket 2" # Descending order by default likely
    assert data[1]["subject"] == "Ticket 1"

def test_get_ticket_detail(client, consumer_headers):
    create_resp = client.post("/api/support/tickets", json={
        "subject": "Detail Ticket", "message": "Check details"
    }, headers=consumer_headers)
    ticket_id = create_resp.json()["id"]
    
    resp = client.get(f"/api/support/tickets/{ticket_id}", headers=consumer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == ticket_id
    assert data["subject"] == "Detail Ticket"

def test_get_ticket_other_user_forbidden(client, consumer_headers, partner_headers):
    create_resp = client.post("/api/support/tickets", json={
        "subject": "Consumer Ticket", "message": "Consumer message"
    }, headers=consumer_headers)
    ticket_id = create_resp.json()["id"]
    
    # Partner tries to view Consumer's ticket
    resp = client.get(f"/api/support/tickets/{ticket_id}", headers=partner_headers)
    assert resp.status_code == 404 # According to router logic it raises 404

def test_admin_can_view_any_ticket(client, consumer_headers, admin_headers):
    create_resp = client.post("/api/support/tickets", json={
        "subject": "Consumer Ticket", "message": "Consumer message"
    }, headers=consumer_headers)
    ticket_id = create_resp.json()["id"]
    
    # Admin tries to view Consumer's ticket
    resp = client.get(f"/api/support/tickets/{ticket_id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == ticket_id
