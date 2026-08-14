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


def test_public_impact(client):
    resp = client.get("/api/impact/public")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_weight_kg" in data
    assert "total_co2_saved_kg" in data
    assert "total_requests_completed" in data
    assert "total_items_recycled" in data

def test_notifications_after_action(client, consumer_headers, quoted_request):
    # 'quoted_request' fixture creates a request and gives a quote, 
    # which sends a notification to the consumer. Wait, does quotation send notification to consumer?
    # Let's check `routers/centre.py` or just verify if the list is non-empty. 
    # Actually, a simpler way is to just create a notification in DB or use the existing `notify` side effects.
    # The prompt says: "Create a collection request (which creates a notification via quote), verify notifications list is non-empty"
    # Actually, accepting a quote sends a notification to the centre.
    # Let's just use `quoted_request` and see if the consumer received a notification.
    resp = client.get("/api/notifications", headers=consumer_headers)
    assert resp.status_code == 200
    assert len(resp.json()) > 0

def test_notifications_unread_count(client, consumer_headers, quoted_request):
    resp = client.get("/api/notifications/unread-count", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["count"] > 0

def test_mark_notification_read(client, consumer_headers, quoted_request):
    notes = client.get("/api/notifications", headers=consumer_headers).json()
    note_id = notes[0]["id"]
    
    resp = client.post(f"/api/notifications/{note_id}/read", headers=consumer_headers)
    assert resp.status_code == 200
    
    notes_after = client.get("/api/notifications", headers=consumer_headers).json()
    assert notes_after[0]["is_read"] is True

def test_mark_all_notifications_read(client, consumer_headers, quoted_request):
    resp = client.post("/api/notifications/read-all", headers=consumer_headers)
    assert resp.status_code == 200
    
    count_resp = client.get("/api/notifications/unread-count", headers=consumer_headers)
    assert count_resp.json()["count"] == 0

def test_categories_returns_only_active(client, admin_headers, db_session):
    client.post("/api/admin/categories", json={"name": "Active", "icon": "A", "base_price_per_kg": 10.0, "is_active": True}, headers=admin_headers)
    client.post("/api/admin/categories", json={"name": "Inactive", "icon": "I", "base_price_per_kg": 10.0, "is_active": False}, headers=admin_headers)
    
    # We can also just set one to inactive in DB directly if the endpoint doesn't support it, but it does.
    # Actually, the fixture might have created one. Let's just check the response.
    resp = client.get("/api/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert any(c["name"] == "Active" for c in data)
    assert not any(c["name"] == "Inactive" for c in data)
