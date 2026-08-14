import pytest
from jose import jwt
from datetime import datetime, timezone
import bcrypt

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM
)
from app.models import User

def test_hash_password_returns_hash():
    password = "my_secret_password"
    hashed = hash_password(password)
    assert hashed != password
    assert hashed.startswith("$2") # bcrypt prefix

def test_verify_password_correct():
    password = "my_secret_password"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True

def test_verify_password_incorrect():
    password = "my_secret_password"
    hashed = hash_password(password)
    assert verify_password("wrong_password", hashed) is False

def test_create_access_token_valid():
    data = {"sub": "123"}
    token = create_access_token(data)
    
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "123"
    assert "exp" in payload

def test_create_access_token_expiry():
    data = {"sub": "123"}
    token = create_access_token(data)
    
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    
    delta = exp - now
    # Check if expiry is roughly 7 days from now (within an hour of margin)
    assert 6 <= delta.days <= 7

def test_get_current_user_valid_token(client, consumer_headers):
    # Assuming GET /api/auth/me exists and returns user info
    resp = client.get("/api/auth/me", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "consumer@test.com"

def test_get_current_user_invalid_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert resp.status_code == 401

def test_get_current_user_inactive_user(client, db_session, consumer_headers):
    # Deactivate the consumer
    user = db_session.query(User).filter_by(email="consumer@test.com").first()
    user.is_active = False
    db_session.commit()
    
    resp = client.get("/api/auth/me", headers=consumer_headers)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Account is deactivated"

def test_require_role_authorized(client, consumer_headers):
    # GET /api/consumer/addresses is a consumer route
    resp = client.get("/api/consumer/addresses", headers=consumer_headers)
    assert resp.status_code == 200

def test_require_role_unauthorized(client, consumer_headers):
    # POST /api/admin/categories is an admin route, consumer should get 403
    resp = client.post("/api/admin/categories", json={
        "name": "Test", "icon": "x", "base_price_per_kg": 10.0, "co2_factor_kg": 0.5
    }, headers=consumer_headers)
    assert resp.status_code == 403
