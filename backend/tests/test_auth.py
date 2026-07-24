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
