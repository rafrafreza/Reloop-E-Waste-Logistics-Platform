def test_centre_dashboard(client, centre_headers):
    """Ensure the centre dashboard returns expected stats."""
    response = client.get("/api/centre/dashboard", headers=centre_headers)
    assert response.status_code == 200
    data = response.json()
    assert "pending_requests" in data
    assert "active_requests" in data

def test_centre_get_incoming_requests(client, centre_headers):
    """Centre can view requests pending quotation in their city."""
    response = client.get("/api/centre/requests", headers=centre_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_centre_quote_invalid_request(client, centre_headers):
    """Ensure quoting a non-existent request returns a 404 Not Found (Edge Case)."""
    payload = {
        "handling_charge": 150.0,
        "pickup_charge": 50.0
    }
    response = client.post("/api/centre/requests/99999/quote", json=payload, headers=centre_headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_centre_assign_invalid_partner(client, centre_headers):
    """Ensure assigning a non-existent partner returns 404 (Edge Case)."""
    payload = {"partner_user_id": 99999}
    response = client.post("/api/centre/requests/1/assign", json=payload, headers=centre_headers)
    # Could be 404 for request or 404 for partner, but it should fail safely.
    assert response.status_code in [404, 400]

def test_consumer_cannot_access_centre_inventory(client, consumer_headers):
    """Ensure consumers are strictly forbidden from viewing the centre's private inventory."""
    response = client.get("/api/centre/inventory", headers=consumer_headers)
    assert response.status_code == 403
    assert "role" in response.json()["detail"].lower()
