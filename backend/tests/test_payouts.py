import app.cashfree as cashfree_module
import app.cashfree_payout as cashfree_payout_module
from app.auth import hash_password
from app.models import CollectionRequest, PartnerProfile, Payout, Quotation, User


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def test_create_upi_transfer_builds_expected_payload(monkeypatch):
    captured = {}

    class FakeClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def post(self, url, json, headers):
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return _FakeResponse({
                "status": "SUCCESS",
                "beneficiary_details": {"beneficiary_id": "BEN_123"},
            })

    monkeypatch.setattr(cashfree_module, "CASHFREE_CLIENT_ID", "demo-client")
    monkeypatch.setattr(cashfree_module, "CASHFREE_CLIENT_SECRET", "demo-secret")
    monkeypatch.setattr(cashfree_module.httpx, "Client", FakeClient)

    result = cashfree_module.create_upi_transfer(
        transfer_id="RLC_TEST_1",
        amount=250.5,
        vpa="consumer@upi",
        beneficiary_name="Consumer Name",
        beneficiary_phone="9999999999",
        beneficiary_email="consumer@example.com",
        remarks="Reloop Consumer Payout",
    )

    assert result["http_status"] == 200
    assert result["status"] == "SUCCESS"
    assert captured["url"] == "https://sandbox.cashfree.com/payout/transfers"
    assert captured["json"]["transfer_mode"] == "upi"
    assert captured["json"]["transfer_amount"] == 250.5
    assert captured["headers"]["x-client-id"] == "demo-client"
    assert captured["headers"]["x-client-secret"] == "demo-secret"


def test_process_consumer_payout_success_for_online_payment(db_session, monkeypatch):
    consumer = User(
        email="consumer.payout@test.com",
        hashed_password=hash_password("pass123"),
        full_name="Consumer Payout",
        role="CONSUMER",
        phone="9999999999",
        is_active=True,
    )
    db_session.add(consumer)
    db_session.flush()

    request = CollectionRequest(
        consumer_id=consumer.id,
        pickup_street="12 Main Road",
        pickup_city="Delhi",
        pickup_state="DL",
        pickup_pincode="110001",
        payment_method="ONLINE",
        consumer_upi_id="consumer@upi",
        status="PICKED_UP",
        consumer=consumer,
    )
    db_session.add(request)
    db_session.flush()

    quotation = Quotation(request_id=request.id, total_amount=350.0)
    db_session.add(quotation)
    db_session.flush()
    request.quotation = quotation

    def fake_create_upi_transfer(**kwargs):
        return {
            "http_status": 200,
            "status": "SUCCESS",
            "beneficiary_details": {"beneficiary_id": "BEN_CONSUMER"},
        }

    monkeypatch.setattr(cashfree_payout_module, "create_upi_transfer", fake_create_upi_transfer)

    cashfree_payout_module.process_consumer_payout(db_session, request)
    db_session.commit()

    payout = db_session.query(Payout).filter(Payout.request_id == request.id).one()
    assert payout.payout_type == "CONSUMER"
    assert payout.status == "SUCCESS"
    assert payout.cashfree_status == "SUCCESS"
    assert payout.beneficiary_id == "BEN_CONSUMER"
    assert payout.transfer_id.startswith("RLC_")


def test_process_partner_payout_success_resets_wallet_balance(db_session, monkeypatch):
    partner_user = User(
        email="partner.payout@test.com",
        hashed_password=hash_password("pass123"),
        full_name="Partner Payout",
        role="PARTNER",
        phone="8888888888",
        is_active=True,
    )
    db_session.add(partner_user)
    db_session.flush()

    profile = PartnerProfile(
        user_id=partner_user.id,
        city="Delhi",
        total_earnings=525.0,
        upi_id="partner@upi",
    )
    db_session.add(profile)
    db_session.flush()

    def fake_create_upi_transfer(**kwargs):
        return {
            "http_status": 201,
            "status": "SUCCESS",
            "beneficiary_details": {"beneficiary_id": "BEN_PARTNER"},
        }

    monkeypatch.setattr(cashfree_payout_module, "create_upi_transfer", fake_create_upi_transfer)

    result = cashfree_payout_module.process_partner_payout(db_session, partner_user.id)
    db_session.refresh(profile)

    assert result["ok"] is True
    assert result["amount"] == 525.0
    assert profile.total_earnings == 0.0

    payout = db_session.query(Payout).filter(Payout.user_id == partner_user.id).one()
    assert payout.payout_type == "PARTNER"
    assert payout.status == "SUCCESS"
    assert payout.cashfree_status == "SUCCESS"
    assert payout.beneficiary_id == "BEN_PARTNER"
    assert payout.transfer_id.startswith("RLP_")


def test_admin_payout_routes_list_retry_and_status(client, db_session, admin_headers, monkeypatch):
    admin_user = db_session.query(User).filter(User.email == "admin@test.com").one()
    payout = Payout(
        user_id=admin_user.id,
        payout_type="CONSUMER",
        amount=150.0,
        payment_method="ONLINE",
        upi_id="bad@upi",
        transfer_id="RLR_ADMIN_1",
        status="FAILED",
        cashfree_status="ERROR",
        cashfree_status_code="INVALID_VPA",
    )
    db_session.add(payout)
    db_session.commit()

    response = client.get("/api/admin/payouts", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert any(item["id"] == payout.id for item in data)

    retry_resp = client.post(f"/api/admin/payouts/{payout.id}/retry", headers=admin_headers)
    assert retry_resp.status_code == 400
    assert "invalid" in retry_resp.json()["detail"].lower()

    def fake_get_transfer_status(transfer_id):
        assert transfer_id == payout.transfer_id
        return {
            "http_status": 200,
            "status": "SUCCESS",
            "beneficiary_details": {"beneficiary_id": "BEN_STATUS"},
            "status_code": "SUCCESS",
        }

    monkeypatch.setattr(cashfree_module, "get_transfer_status", fake_get_transfer_status)
    status_resp = client.get(f"/api/admin/payouts/{payout.id}/status", headers=admin_headers)
    assert status_resp.status_code == 200

    db_session.refresh(payout)
    assert payout.status == "SUCCESS"
    assert payout.cashfree_status == "SUCCESS"
    assert payout.beneficiary_id == "BEN_STATUS"

    partner_user = User(
        email="partner.admin.route@test.com",
        hashed_password=hash_password("pass123"),
        full_name="Partner Route",
        role="PARTNER",
        phone="7777777777",
        is_active=True,
    )
    db_session.add(partner_user)
    db_session.flush()

    partner_profile = PartnerProfile(
        user_id=partner_user.id,
        city="Bengaluru",
        total_earnings=420.0,
        upi_id="partner-route@upi",
    )
    db_session.add(partner_profile)
    db_session.flush()

    def fake_partner_create_upi_transfer(**kwargs):
        return {
            "http_status": 201,
            "status": "SUCCESS",
            "beneficiary_details": {"beneficiary_id": "BEN_ROUTE"},
        }

    monkeypatch.setattr(cashfree_payout_module, "create_upi_transfer", fake_partner_create_upi_transfer)
    partner_resp = client.post(f"/api/admin/payouts/process-partner/{partner_user.id}", headers=admin_headers)
    assert partner_resp.status_code == 200
    data = partner_resp.json()
    assert data["ok"] is True
    assert data["amount"] == 420.0
    assert data["transfer_id"].startswith("RLP_")
