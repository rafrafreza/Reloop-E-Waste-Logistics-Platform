def test_health_check(client):
    """Ensure the health check endpoint returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_user_registration(client):
    """Test that a new consumer user can register successfully."""
    payload = {
        "email": "testconsumer@reloop.com",
        "password": "securepassword",
        "full_name": "Test Consumer",
        "phone": "1234567890",
        "role": "CONSUMER"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testconsumer@reloop.com"
    assert data["user"]["role"] == "CONSUMER"
    assert "id" in data["user"]

def test_user_login(client):
    """Test that a user can login and receive a JWT token."""
    # The user was created in the previous test (if tests run sequentially, 
    # but normally we should create the user inside the test or via a fixture.
    # We will register them here again just in case tests run out of order).
    client.post("/api/auth/register", json={
        "email": "loginuser@reloop.com",
        "password": "loginpass",
        "full_name": "Login User",
        "phone": "0987654321",
        "role": "CONSUMER"
    })

    response = client.post("/api/auth/login", json={
        "email": "loginuser@reloop.com",
        "password": "loginpass"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "loginuser@reloop.com"

def test_login_wrong_password(client):
    """Test that login fails with an incorrect password."""
    response = client.post("/api/auth/login", json={
        "email": "loginuser@reloop.com",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "detail" in response.json()

def test_register_duplicate_email(client):
    payload = {
        "email": "dup@test.com",
        "password": "pass123",
        "full_name": "Dup",
        "role": "CONSUMER"
    }
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400

def test_register_partner_requires_city(client):
    payload = {
        "email": "p@test.com",
        "password": "pass123",
        "full_name": "Partner",
        "role": "PARTNER",
        "vehicle_number": "UP12"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "City is required" in resp.json()["detail"]

def test_register_centre_requires_fields(client):
    payload = {
        "email": "c@test.com",
        "password": "pass123",
        "full_name": "Centre",
        "role": "CENTRE",
        "city": "Delhi"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "Centre name is required" in resp.json()["detail"]

def test_register_admin_role_blocked(client):
    payload = {
        "email": "admin2@test.com",
        "password": "pass123",
        "full_name": "Admin",
        "role": "ADMIN"
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 422

def test_register_with_referral_code(client, db_session):
    resp1 = client.post("/api/auth/register", json={
        "email": "ref1@test.com",
        "password": "pass123",
        "full_name": "Ref 1",
        "role": "CONSUMER"
    })
    assert resp1.status_code == 201
    
    from app.models import User
    user1 = db_session.query(User).filter_by(email="ref1@test.com").first()
    ref_code = user1.referral_code

    resp2 = client.post("/api/auth/register", json={
        "email": "ref2@test.com",
        "password": "pass123",
        "full_name": "Ref 2",
        "role": "CONSUMER",
        "referral_code": ref_code
    })
    assert resp2.status_code == 201
    
    db_session.refresh(user1)
    user2 = db_session.query(User).filter_by(email="ref2@test.com").first()
    assert user1.reward_points == 50
    assert user2.reward_points == 20

def test_partner_login_pending_approval(client):
    payload = {
        "email": "pend@test.com",
        "password": "pass123",
        "full_name": "Partner Pend",
        "role": "PARTNER",
        "city": "Delhi",
        "vehicle_number": "123"
    }
    client.post("/api/auth/register", json=payload)
    
    resp = client.post("/api/auth/login", json={"email": "pend@test.com", "password": "pass123"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "PENDING_APPROVAL"

def test_get_me_endpoint(client, consumer_headers):
    resp = client.get("/api/auth/me", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "consumer@test.com"

def test_get_profile_consumer(client, consumer_headers):
    resp = client.get("/api/auth/profile", headers=consumer_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "consumer@test.com"

def test_get_profile_partner(client, partner_headers):
    resp = client.get("/api/auth/profile", headers=partner_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "PARTNER"
    assert "vehicle_number" in data
    assert data["city"] == "Delhi"

def test_update_profile(client, consumer_headers):
    resp = client.put("/api/auth/profile", json={"full_name": "Updated Name"}, headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Updated Name"

def test_change_password_success(client, consumer_headers):
    resp = client.put("/api/auth/change-password", json={"current_password": "pass123", "new_password": "newpass"}, headers=consumer_headers)
    assert resp.status_code == 200
    
    login_resp = client.post("/api/auth/login", json={"email": "consumer@test.com", "password": "newpass"})
    assert login_resp.status_code == 200

def test_change_password_wrong_current(client, consumer_headers):
    resp = client.put("/api/auth/change-password", json={"current_password": "wrong", "new_password": "newpass"}, headers=consumer_headers)
    assert resp.status_code == 400
