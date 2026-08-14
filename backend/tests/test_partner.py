def test_partner_dashboard(client, partner_headers):
    """Ensure the pickup partner dashboard returns expected stats."""
    response = client.get("/api/partner/dashboard", headers=partner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "active_requests" in data
    assert "completed_requests" in data

def test_partner_get_assignments(client, partner_headers):
    """Partner can fetch their active pickup assignments."""
    response = client.get("/api/partner/requests", headers=partner_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_partner_start_pickup_invalid_request(client, partner_headers):
    """Partner attempting to start a non-existent pickup returns 404 (Edge Case)."""
    response = client.post("/api/partner/requests/99999/start", headers=partner_headers)
    assert response.status_code == 404

def test_partner_verify_otp_invalid(client, partner_headers):
    """Partner submitting a bad OTP or to a non-existent request returns 404/400 (Edge Case)."""
    payload = {
        "otp": "000000",
        "items": []
    }
    response = client.post("/api/partner/requests/99999/verify-otp", json=payload, headers=partner_headers)
    assert response.status_code in [404, 400]

def test_centre_cannot_access_partner_routes(client, centre_headers):
    """Ensure strict role boundaries: Segregation Centre hitting Partner endpoint gets 403."""
    response = client.get("/api/partner/dashboard", headers=centre_headers)
    assert response.status_code == 403
    assert "role" in response.json()["detail"].lower()
from app.models import CollectionRequest
from unittest.mock import patch

def test_list_available_requests(client, partner_headers, accepted_request):
    response = client.get("/api/partner/available-requests", headers=partner_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(r["id"] == accepted_request["id"] for r in data)

def test_accept_request_success(client, partner_headers, accepted_request, db_session):
    response = client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ASSIGNED"
    
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == accepted_request["id"]).first()
    assert req_db.pickup_otp is not None
    assert len(req_db.pickup_otp) == 6

def test_accept_request_busy_partner(client, partner_headers, accepted_request, db_session):
    client.post(f"/api/partner/requests/{accepted_request['id']}/accept", headers=partner_headers)
    
    response = client.post(f"/api/partner/requests/{accepted_request['id']}/accept", headers=partner_headers)
    assert response.status_code == 400
    assert "available" in response.json()["detail"].lower()

def test_start_pickup_success(client, partner_headers, accepted_request):
    client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    response = client.post(f"/api/partner/requests/{accepted_request["id"]}/start", headers=partner_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "OUT_FOR_PICKUP"

def test_start_pickup_wrong_status(client, partner_headers, accepted_request):
    response = client.post(f"/api/partner/requests/{accepted_request['id']}/start", headers=partner_headers)
    assert response.status_code == 404

def test_verify_otp_success(client, partner_headers, accepted_request, db_session):
    client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{accepted_request["id"]}/start", headers=partner_headers)
    
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == accepted_request["id"]).first()
    otp = req_db.pickup_otp
    item_id = req_db.items[0].id
    
    payload = {
        "otp": otp,
        "items": [{"item_id": item_id, "actual_weight_kg": 5.0}]
    }
    with patch("app.cashfree_payout.process_consumer_payout"):
        response = client.post(f"/api/partner/requests/{accepted_request["id"]}/verify-otp", json=payload, headers=partner_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "PICKED_UP"

def test_verify_otp_wrong_code(client, partner_headers, accepted_request):
    client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{accepted_request["id"]}/start", headers=partner_headers)
    
    payload = {
        "otp": "000000",
        "items": []
    }
    response = client.post(f"/api/partner/requests/{accepted_request["id"]}/verify-otp", json=payload, headers=partner_headers)
    assert response.status_code == 400

def test_verify_otp_actual_weights(client, partner_headers, accepted_request, db_session):
    client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{accepted_request["id"]}/start", headers=partner_headers)
    
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == accepted_request["id"]).first()
    otp = req_db.pickup_otp
    item_id = req_db.items[0].id
    
    payload = {
        "otp": otp,
        "items": [{"item_id": item_id, "actual_weight_kg": 10.0}]
    }
    with patch("app.cashfree_payout.process_consumer_payout"):
        response = client.post(f"/api/partner/requests/{accepted_request["id"]}/verify-otp", json=payload, headers=partner_headers)
    assert response.status_code == 200
    
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == accepted_request["id"]).first()
    assert req_db.items[0].actual_weight_kg == 10.0
    assert req_db.quotation.material_value == 1500.0

def test_deliver_to_centre(client, partner_headers, accepted_request, db_session):
    client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{accepted_request["id"]}/start", headers=partner_headers)
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == accepted_request["id"]).first()
    otp = req_db.pickup_otp
    item_id = req_db.items[0].id
    payload = {"otp": otp, "items": [{"item_id": item_id, "actual_weight_kg": 5.0}]}
    with patch("app.cashfree_payout.process_consumer_payout"):
        client.post(f"/api/partner/requests/{accepted_request["id"]}/verify-otp", json=payload, headers=partner_headers)
    
    response = client.post(f"/api/partner/requests/{accepted_request["id"]}/deliver", headers=partner_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "AT_CENTRE"

def test_deliver_wrong_status(client, partner_headers, accepted_request):
    response = client.post(f"/api/partner/requests/{accepted_request['id']}/deliver", headers=partner_headers)
    assert response.status_code == 404

def test_set_availability_online(client, partner_headers):
    response = client.patch("/api/partner/availability?available=true", headers=partner_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "AVAILABLE"

def test_set_availability_offline(client, partner_headers):
    response = client.patch("/api/partner/availability?available=false", headers=partner_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "OFFLINE"

def test_set_availability_while_busy(client, partner_headers, accepted_request):
    client.post(f"/api/partner/requests/{accepted_request["id"]}/accept", headers=partner_headers)
    response = client.patch("/api/partner/availability?available=false", headers=partner_headers)
    assert response.status_code == 400
    assert "active job" in response.json()["detail"].lower()

def test_partner_earnings(client, partner_headers):
    response = client.get("/api/partner/earnings", headers=partner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_earnings" in data
    assert "paid_earnings" in data
    assert "pending_earnings" in data
