import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.database import Base, get_db
import app.models  # Required so Base.metadata is populated

# Use an in-memory SQLite database for blazing fast, isolated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Create all tables in the in-memory database before running tests."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Provides a fresh database session for a test."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    """Provides a FastAPI TestClient with the database dependency overridden."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()

from app.auth import hash_password
from app.models import User, CentreProfile, PartnerProfile

@pytest.fixture
def consumer_headers(client, db_session):
    user = User(email="consumer@test.com", hashed_password=hash_password("pass123"), full_name="Consumer", role="CONSUMER", is_active=True)
    db_session.add(user)
    db_session.commit()
    res = client.post("/api/auth/login", json={"email": "consumer@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture
def admin_headers(client, db_session):
    user = User(email="admin@test.com", hashed_password=hash_password("pass123"), full_name="Admin", role="ADMIN", is_active=True)
    db_session.add(user)
    db_session.commit()
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture
def centre_headers(client, db_session):
    user = User(email="centre@test.com", hashed_password=hash_password("pass123"), full_name="Centre", role="CENTRE", is_active=True)
    db_session.add(user)
    db_session.commit()
    profile = CentreProfile(user_id=user.id, centre_name="Test Centre", city="Delhi", address="123", capacity_kg=100.0)
    db_session.add(profile)
    db_session.commit()
    res = client.post("/api/auth/login", json={"email": "centre@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture
def partner_headers(client, db_session):
    user = User(email="partner@test.com", hashed_password=hash_password("pass123"), full_name="Partner", role="PARTNER", is_active=True)
    db_session.add(user)
    db_session.commit()
    profile = PartnerProfile(user_id=user.id, vehicle_number="DL-123", city="Delhi", status="AVAILABLE")
    db_session.add(profile)
    db_session.commit()
    res = client.post("/api/auth/login", json={"email": "partner@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

# ---------------------------------------------------------------------------
# Shared lifecycle fixtures — composable building blocks for integration & E2E
# ---------------------------------------------------------------------------

@pytest.fixture
def category(client, admin_headers):
    """Creates a test e-waste category (Mobile Phone, ₹150/kg)."""
    resp = client.post("/api/admin/categories", json={
        "name": "Mobile Phone", "icon": "📱",
        "base_price_per_kg": 150.0, "is_active": True,
        "co2_factor_kg": 0.5
    }, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()

@pytest.fixture
def consumer_address(client, consumer_headers):
    """Creates a test address in Delhi for the consumer."""
    resp = client.post("/api/consumer/addresses", json={
        "label": "Home", "street": "123 Test St",
        "city": "Delhi", "state": "Delhi",
        "pincode": "110001", "lat": 28.6139, "lng": 77.2090,
        "is_default": True
    }, headers=consumer_headers)
    assert resp.status_code == 201
    return resp.json()

@pytest.fixture
def collection_request(client, consumer_headers, consumer_address, category):
    """Creates a PENDING collection request with one item."""
    resp = client.post("/api/consumer/requests", json={
        "address_id": consumer_address["id"],
        "preferred_date": "2026-08-15",
        "notes": "Test pickup",
        "items": [{
            "category_id": category["id"],
            "description": "Old phone",
            "quantity": 1,
            "estimated_weight_kg": 0.5,
            "image_urls": []
        }]
    }, headers=consumer_headers)
    assert resp.status_code == 201
    return resp.json()

@pytest.fixture
def quoted_request(client, centre_headers, collection_request):
    """Creates a QUOTED request (centre has provided a quote)."""
    req_id = collection_request["id"]
    resp = client.post(f"/api/centre/requests/{req_id}/quote", json={
        "handling_charge": 20.0,
        "pickup_charge": 30.0
    }, headers=centre_headers)
    assert resp.status_code == 200
    return resp.json()

@pytest.fixture
def accepted_request(client, consumer_headers, quoted_request):
    """Creates an ACCEPTED request (consumer accepted the quote with CASH)."""
    req_id = quoted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={
        "payment_method": "CASH"
    }, headers=consumer_headers)
    assert resp.status_code == 200
    return resp.json()
