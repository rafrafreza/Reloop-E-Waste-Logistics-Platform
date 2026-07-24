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
