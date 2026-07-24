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
