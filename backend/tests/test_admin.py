def test_admin_get_users(client, admin_headers):
    """Admin should be able to get a list of users."""
    response = client.get("/api/admin/users", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_consumer_cannot_access_admin(client, consumer_headers):
    """Ensure non-admin users get a 403 Forbidden when accessing admin routes."""
    response = client.get("/api/admin/users", headers=consumer_headers)
    assert response.status_code == 403
    assert "role" in response.json()["detail"].lower()

def test_admin_create_category(client, admin_headers):
    """Admin can create new e-waste categories."""
    payload = {"name": "Phones", "icon": "📱", "base_price_per_kg": 20.0}
    response = client.post("/api/admin/categories", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Phones"
    assert data["base_price_per_kg"] == 20.0

def test_admin_toggle_user_active(client, admin_headers, consumer_headers):
    """Admin can deactivate a user account."""
    # Step 1: Find the consumer user id
    users_resp = client.get("/api/admin/users", headers=admin_headers)
    consumer_user = next(u for u in users_resp.json() if u["email"] == "consumer@test.com")
    user_id = consumer_user["id"]
    
    # Step 2: Toggle their status (Deactivate)
    toggle_resp = client.patch(f"/api/admin/users/{user_id}/toggle-active", headers=admin_headers)
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["is_active"] is False

    # Step 3: Ensure they can no longer login
    login_resp = client.post("/api/auth/login", json={"email": "consumer@test.com", "password": "pass123"})
    assert login_resp.status_code == 403
    assert "deactivated" in login_resp.json()["detail"].lower()
