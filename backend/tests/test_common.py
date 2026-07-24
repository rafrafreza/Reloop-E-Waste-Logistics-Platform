def test_get_categories_empty(client):
    """Test fetching categories when database is empty returns []"""
    response = client.get("/api/categories")
    assert response.status_code == 200
    assert response.json() == []

def test_get_categories_populated(client, admin_headers):
    """Test fetching categories after admin creates one."""
    payload = {"name": "Laptops", "icon": "💻", "base_price_per_kg": 50.0}
    client.post("/api/admin/categories", json=payload, headers=admin_headers)
    
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Laptops"
    assert data[0]["base_price_per_kg"] == 50.0

def test_get_public_settings(client, admin_headers):
    """Test fetching public settings (like service_cities)."""
    # Create setting first
    client.put("/api/admin/settings/service_cities", json={"value": "Delhi,Mumbai"}, headers=admin_headers)
    
    response = client.get("/api/settings/public")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)

def test_notifications_unauthorized(client):
    """Ensure unauthenticated users cannot read notifications."""
    response = client.get("/api/notifications")
    assert response.status_code == 401

def test_notifications_empty_for_new_user(client, consumer_headers):
    """Ensure a new user has zero notifications."""
    response = client.get("/api/notifications", headers=consumer_headers)
    assert response.status_code == 200
    assert response.json() == []
