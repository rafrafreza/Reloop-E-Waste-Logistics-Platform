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
from app.models import SupportTicket

def test_admin_dashboard_stats(client, admin_headers):
    response = client.get("/api/admin/dashboard", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_revenue" in data

def test_admin_analytics(client, admin_headers):
    response = client.get("/api/admin/analytics", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "request_status_distribution" in data
    assert "category_breakdown" in data

def test_admin_update_category(client, admin_headers):
    response = client.post("/api/admin/categories", json={"name": "Temp", "icon": "X", "base_price_per_kg": 10}, headers=admin_headers)
    cat_id = response.json()["id"]
    
    response = client.put(f"/api/admin/categories/{cat_id}", json={"name": "Updated", "icon": "Y", "base_price_per_kg": 20}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"

def test_admin_delete_category(client, admin_headers):
    response = client.post("/api/admin/categories", json={"name": "ToDelete", "icon": "X", "base_price_per_kg": 10}, headers=admin_headers)
    cat_id = response.json()["id"]
    
    response = client.delete(f"/api/admin/categories/{cat_id}", headers=admin_headers)
    assert response.status_code == 204

def test_admin_list_settings(client, admin_headers):
    response = client.get("/api/admin/settings", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_update_setting(client, admin_headers, db_session):
    from app.models import Setting
    db_session.add(Setting(key="test_key", value="10", description="T"))
    db_session.commit()
    response = client.put("/api/admin/settings/test_key", json={"value": "15"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["value"] == "15"

def test_admin_list_centres(client, admin_headers):
    response = client.get("/api/admin/centres", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_list_partners(client, admin_headers):
    response = client.get("/api/admin/partners", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_list_requests(client, admin_headers, collection_request):
    response = client.get("/api/admin/requests", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) > 0

def test_admin_list_requests_filter(client, admin_headers, collection_request):
    response = client.get("/api/admin/requests?status=PENDING", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert all(r["status"] == "PENDING" for r in response.json())

def test_admin_revenue_stats(client, admin_headers):
    response = client.get("/api/admin/revenue", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_material_value" in data

def test_admin_impact_stats(client, admin_headers):
    response = client.get("/api/admin/impact", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_co2_saved_kg" in data

def test_admin_audit_log(client, admin_headers):
    client.post("/api/admin/categories", json={"name": "Audit Test", "icon": "A", "base_price_per_kg": 10}, headers=admin_headers)
    response = client.get("/api/admin/audit-log", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) > 0

def test_admin_list_tickets(client, admin_headers, db_session):
    ticket = SupportTicket(user_id=1, subject="Help", message="Test", status="OPEN")
    db_session.add(ticket)
    db_session.commit()
    
    response = client.get("/api/admin/support/tickets", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) > 0

def test_admin_respond_to_ticket(client, admin_headers, db_session):
    ticket = SupportTicket(user_id=1, subject="Help", message="Test", status="OPEN")
    db_session.add(ticket)
    db_session.commit()
    
    response = client.put(f"/api/admin/support/tickets/{ticket.id}", json={"status": "RESOLVED", "admin_response": "Fixed"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "RESOLVED"
    assert response.json()["admin_response"] == "Fixed"

def test_admin_approve_partner_account(client, admin_headers):
    # Register an inactive partner
    resp = client.post("/api/auth/register", json={
        "email": "newpartner@test.com", "password": "pass123", "full_name": "NP", "phone": "9999",
        "city": "Delhi", "role": "PARTNER", "vehicle_number": "DL-11"
    })
    assert resp.status_code == 201
    
    users_resp = client.get("/api/admin/users", headers=admin_headers)
    partner_user = next(u for u in users_resp.json() if u["email"] == "newpartner@test.com")
    user_id = partner_user["id"]
    
    # Toggle to active
    toggle_resp = client.patch(f"/api/admin/users/{user_id}/toggle-active", headers=admin_headers)
    assert toggle_resp.status_code == 200
    
    # Login should now succeed
    login_resp = client.post("/api/auth/login", json={"email": "newpartner@test.com", "password": "pass123"})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()
