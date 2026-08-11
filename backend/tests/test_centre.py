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


from app.models import Category


def test_centre_cannot_view_or_quote_cancelled_request(client, consumer_headers, centre_headers, db_session):
    """Ensure requests cancelled before quotation are hidden from centre and cannot be quoted."""
    cat = Category(name="Electronics", icon="📱", base_price_per_kg=10.0, is_active=True)
    db_session.add(cat)
    db_session.commit()

    addr_res = client.post("/api/consumer/addresses", json={
        "label": "Home", "street": "Main St", "city": "Delhi", "state": "Delhi", "pincode": "110001"
    }, headers=consumer_headers)
    assert addr_res.status_code == 201
    addr_id = addr_res.json()["id"]

    req_res = client.post("/api/consumer/requests", json={
        "address_id": addr_id,
        "items": [{"category_id": cat.id, "quantity": 1, "estimated_weight_kg": 2.0}]
    }, headers=consumer_headers)
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    cancel_res = client.post(f"/api/consumer/requests/{req_id}/cancel", headers=consumer_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    list_res = client.get("/api/centre/requests?scope=pending", headers=centre_headers)
    assert list_res.status_code == 200
    ids = [r["id"] for r in list_res.json()]
    assert req_id not in ids

    get_res = client.get(f"/api/centre/requests/{req_id}", headers=centre_headers)
    assert get_res.status_code == 404

    quote_res = client.post(f"/api/centre/requests/{req_id}/quote", json={
        "handling_charge": 100.0, "pickup_charge": 50.0
    }, headers=centre_headers)
    assert quote_res.status_code == 400
