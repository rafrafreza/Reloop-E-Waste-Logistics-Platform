def test_consumer_create_address(client, consumer_headers):
    """Consumer can add a new address to their profile."""
    payload = {
        "label": "Home",
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "MH",
        "pincode": "400001"
    }
    response = client.post("/api/consumer/addresses", json=payload, headers=consumer_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["city"] == "Mumbai"
    assert "id" in data

def test_consumer_create_request_validation(client, consumer_headers):
    """Ensure submitting a pickup request without items throws a 422 error."""
    payload = {
        "address_id": 1,
        "items": []
    }
    response = client.post("/api/consumer/requests", json=payload, headers=consumer_headers)
    assert response.status_code == 422
    assert "least one item" in str(response.json())

def test_consumer_cannot_access_centre_routes(client, consumer_headers):
    """Ensure strict role boundaries: Consumer hitting Centre endpoint gets 403."""
    response = client.get("/api/centre/dashboard", headers=consumer_headers)
    assert response.status_code == 403


def test_list_addresses(client, consumer_headers, consumer_address):
    resp = client.get("/api/consumer/addresses", headers=consumer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["id"] == consumer_address["id"]

def test_update_address(client, consumer_headers, consumer_address):
    addr_id = consumer_address["id"]
    resp = client.put(f"/api/consumer/addresses/{addr_id}", json={
        "label": "Work",
        "street": "456 Work St",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110002",
        "is_default": True
    }, headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["label"] == "Work"

def test_delete_address(client, consumer_headers, consumer_address):
    addr_id = consumer_address["id"]
    resp = client.delete(f"/api/consumer/addresses/{addr_id}", headers=consumer_headers)
    assert resp.status_code == 204
    
    resp_get = client.get("/api/consumer/addresses", headers=consumer_headers)
    assert resp_get.status_code == 200
    # Address was deleted, should not be in the list
    assert not any(a["id"] == addr_id for a in resp_get.json())

def test_create_request_success(client, consumer_headers, consumer_address, category):
    payload = {
        "address_id": consumer_address["id"],
        "preferred_date": "2026-09-01",
        "notes": "Please pick up",
        "items": [{
            "category_id": category["id"],
            "description": "Old laptop",
            "quantity": 1,
            "estimated_weight_kg": 2.5,
            "image_urls": []
        }]
    }
    resp = client.post("/api/consumer/requests", json=payload, headers=consumer_headers)
    assert resp.status_code == 201
    assert resp.json()["status"] == "PENDING"
    assert len(resp.json()["items"]) == 1

def test_create_request_invalid_category(client, consumer_headers, consumer_address):
    payload = {
        "address_id": consumer_address["id"],
        "items": [{
            "category_id": 9999,
            "description": "Old laptop",
            "quantity": 1,
            "estimated_weight_kg": 2.5,
            "image_urls": []
        }]
    }
    resp = client.post("/api/consumer/requests", json=payload, headers=consumer_headers)
    assert resp.status_code == 400

def test_create_request_invalid_address(client, consumer_headers, category):
    payload = {
        "address_id": 9999,
        "items": [{
            "category_id": category["id"],
            "description": "Old laptop",
            "quantity": 1,
            "estimated_weight_kg": 2.5,
            "image_urls": []
        }]
    }
    resp = client.post("/api/consumer/requests", json=payload, headers=consumer_headers)
    assert resp.status_code == 404

def test_list_requests(client, consumer_headers, collection_request):
    resp = client.get("/api/consumer/requests", headers=consumer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["id"] == collection_request["id"]

def test_list_requests_filter_status(client, consumer_headers, collection_request):
    resp = client.get("/api/consumer/requests?status=PENDING", headers=consumer_headers)
    assert resp.status_code == 200
    assert any(r["id"] == collection_request["id"] for r in resp.json())
    
    resp_empty = client.get("/api/consumer/requests?status=COMPLETED", headers=consumer_headers)
    assert resp_empty.status_code == 200
    assert not any(r["id"] == collection_request["id"] for r in resp_empty.json())

def test_get_request_detail(client, consumer_headers, collection_request):
    req_id = collection_request["id"]
    resp = client.get(f"/api/consumer/requests/{req_id}", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == req_id

def test_accept_quote_cash(client, consumer_headers, quoted_request):
    req_id = quoted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={
        "payment_method": "CASH"
    }, headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ACCEPTED"

def test_accept_quote_wrong_status(client, consumer_headers, collection_request):
    # collection_request is PENDING, not QUOTED
    req_id = collection_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={
        "payment_method": "CASH"
    }, headers=consumer_headers)
    assert resp.status_code == 400

def test_reject_quote(client, consumer_headers, quoted_request):
    req_id = quoted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/reject-quote", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "REJECTED"

def test_cancel_request_pending(client, consumer_headers, collection_request):
    req_id = collection_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/cancel", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "CANCELLED"

def test_cancel_request_wrong_status(client, consumer_headers, accepted_request):
    req_id = accepted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/cancel", headers=consumer_headers)
    assert resp.status_code == 400

def test_consumer_impact(client, consumer_headers):
    resp = client.get("/api/consumer/impact", headers=consumer_headers)
    assert resp.status_code == 200
    assert "total_co2_saved_kg" in resp.json()

def test_rate_non_completed_fails(client, consumer_headers, accepted_request):
    req_id = accepted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/rate", json={
        "partner_rating": 5
    }, headers=consumer_headers)
    assert resp.status_code == 400
    assert "completed" in resp.json()["detail"].lower()
