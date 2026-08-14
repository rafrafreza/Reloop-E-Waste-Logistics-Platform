import pytest
from unittest.mock import patch
from app.models import CollectionRequest, InventoryItem, User, Notification, StatusHistory, Payout

def test_full_happy_path_cash_payment(client, db_session, consumer_headers, centre_headers, partner_headers, admin_headers, consumer_address, category):
    # 2. Consumer creates collection request with 1 item
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
    req_data = resp.json()
    req_id = req_data["id"]
    item_id = req_data["items"][0]["id"]
    
    # 3. Assert status is PENDING
    assert req_data["status"] == "PENDING"
    
    # 4. Centre quotes the request
    resp = client.post(f"/api/centre/requests/{req_id}/quote", json={
        "handling_charge": 20.0,
        "pickup_charge": 30.0
    }, headers=centre_headers)
    assert resp.status_code == 200
    quote_data = resp.json()
    
    # 5. Assert status is QUOTED, material_value is 75.0 (0.5 * 150)
    assert quote_data["status"] == "QUOTED"
    assert quote_data["quotation"]["material_value"] == 75.0
    
    # 6. Consumer accepts quote with CASH
    resp = client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={
        "payment_method": "CASH"
    }, headers=consumer_headers)
    assert resp.status_code == 200
    
    # 7. Assert status is ACCEPTED
    assert resp.json()["status"] == "ACCEPTED"
    
    # 8. Partner accepts request
    resp = client.post(f"/api/partner/requests/{req_id}/accept", headers=partner_headers)
    assert resp.status_code == 200
    
    # 9. Assert status is ASSIGNED, partner status is BUSY
    assert resp.json()["status"] == "ASSIGNED"
    resp_partner = client.get("/api/auth/profile", headers=partner_headers)
    assert resp_partner.json()["status"] == "BUSY"
    
    # 10. Get OTP
    db_session.expire_all()
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == req_id).first()
    otp = req_db.pickup_otp
    assert otp is not None
    
    # 11. Partner starts pickup
    resp = client.post(f"/api/partner/requests/{req_id}/start", headers=partner_headers)
    assert resp.status_code == 200
    
    # 12. Assert status is OUT_FOR_PICKUP
    assert resp.json()["status"] == "OUT_FOR_PICKUP"
    
    # 13. Partner verifies OTP with actual weight 0.6kg
    with patch('app.cashfree_payout.process_consumer_payout') as mock_payout:
        resp = client.post(f"/api/partner/requests/{req_id}/verify-otp", json={
            "otp": otp,
            "items": [{"item_id": item_id, "actual_weight_kg": 0.6}]
        }, headers=partner_headers)
        assert resp.status_code == 200
        mock_payout.assert_called_once()
        
    # 14. Assert status is PICKED_UP
    assert resp.json()["status"] == "PICKED_UP"
    
    # 15. Partner delivers to centre
    resp = client.post(f"/api/partner/requests/{req_id}/deliver", headers=partner_headers)
    assert resp.status_code == 200
    
    # 16. Assert status is AT_CENTRE, partner back to AVAILABLE
    assert resp.json()["status"] == "AT_CENTRE"
    resp_partner = client.get("/api/auth/profile", headers=partner_headers)
    assert resp_partner.json()["status"] == "AVAILABLE"
    
    # 17. Verify inventory was created
    resp = client.get("/api/centre/inventory", headers=centre_headers)
    assert resp.status_code == 200
    inventory = resp.json()
    assert len(inventory) == 1
    assert inventory[0]["status"] == "IN_STORAGE"
    inv_id = inventory[0]["id"]
    
    # 18. Centre completes request
    resp = client.post(f"/api/centre/requests/{req_id}/complete", headers=centre_headers)
    assert resp.status_code == 200
    
    # 19. Assert COMPLETED
    assert resp.json()["status"] == "COMPLETED"
    
    # 20. Verify consumer got 10 reward points
    db_session.expire_all()
    consumer = db_session.query(User).filter(User.email == "consumer@test.com").first()
    assert consumer.reward_points >= 10
    
    # 21. Verify partner earnings increased
    partner = db_session.query(User).filter(User.email == "partner@test.com").first()
    assert partner.partner_profile.total_earnings > 0
    
    # 22. Centre dispatches inventory
    resp = client.post("/api/centre/inventory/dispatch", json={
        "item_ids": [inv_id],
        "recycler_name": "Recycler XYZ"
    }, headers=centre_headers)
    assert resp.status_code == 200
    
    # 23. Assert DISPATCHED
    assert resp.json()[0]["status"] == "DISPATCHED"
    
    # 24. Centre marks recycled
    resp = client.post("/api/centre/inventory/recycle", json={
        "item_ids": [inv_id]
    }, headers=centre_headers)
    assert resp.status_code == 200
    
    # 25. Assert RECYCLED
    assert resp.json()[0]["status"] == "RECYCLED"

def test_consumer_rejects_quote_flow(client, consumer_headers, quoted_request):
    req_id = quoted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/reject-quote", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "REJECTED"
    
    resp_accept = client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={
        "payment_method": "CASH"
    }, headers=consumer_headers)
    assert resp_accept.status_code == 400

def test_consumer_cancels_pending_request(client, consumer_headers, collection_request, centre_headers):
    req_id = collection_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/cancel", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "CANCELLED"
    
    resp_quote = client.post(f"/api/centre/requests/{req_id}/quote", json={
        "handling_charge": 20.0,
        "pickup_charge": 30.0
    }, headers=centre_headers)
    assert resp_quote.status_code == 400

def test_consumer_cancels_quoted_request(client, consumer_headers, quoted_request):
    req_id = quoted_request["id"]
    resp = client.post(f"/api/consumer/requests/{req_id}/cancel", headers=consumer_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "CANCELLED"

def test_wrong_otp_rejected(client, db_session, consumer_headers, partner_headers, accepted_request):
    req_id = accepted_request["id"]
    item_id = accepted_request["items"][0]["id"]
    
    client.post(f"/api/partner/requests/{req_id}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{req_id}/start", headers=partner_headers)
    
    db_session.expire_all()
    req_db = db_session.query(CollectionRequest).filter(CollectionRequest.id == req_id).first()
    otp = req_db.pickup_otp
    wrong_otp = "000000" if otp != "000000" else "111111"
    
    with patch('app.cashfree_payout.process_consumer_payout'):
        resp = client.post(f"/api/partner/requests/{req_id}/verify-otp", json={
            "otp": wrong_otp,
            "items": [{"item_id": item_id, "actual_weight_kg": 0.6}]
        }, headers=partner_headers)
        assert resp.status_code == 400
        
        resp2 = client.post(f"/api/partner/requests/{req_id}/verify-otp", json={
            "otp": otp,
            "items": [{"item_id": item_id, "actual_weight_kg": 0.6}]
        }, headers=partner_headers)
        assert resp2.status_code == 200

def test_partner_availability_lifecycle(client, partner_headers, accepted_request):
    req_id = accepted_request["id"]
    
    resp = client.get("/api/auth/profile", headers=partner_headers)
    assert resp.json()["status"] == "AVAILABLE"
    
    client.post(f"/api/partner/requests/{req_id}/accept", headers=partner_headers)
    
    resp = client.get("/api/auth/profile", headers=partner_headers)
    assert resp.json()["status"] == "BUSY"
    
    resp_offline = client.patch("/api/partner/availability?available=false", headers=partner_headers)
    assert resp_offline.status_code == 400
    
    client.post(f"/api/partner/requests/{req_id}/start", headers=partner_headers)
    # Don't finish the whole thing here, we just verified it doesn't allow offline

def test_multi_item_request_flow(client, db_session, admin_headers, consumer_headers, centre_headers, partner_headers, consumer_address):
    # 1. Create 2 categories
    cat1_resp = client.post("/api/admin/categories", json={
        "name": "Cat1", "icon": "x", "base_price_per_kg": 150.0, "is_active": True, "co2_factor_kg": 0.5
    }, headers=admin_headers)
    cat2_resp = client.post("/api/admin/categories", json={
        "name": "Cat2", "icon": "x", "base_price_per_kg": 200.0, "is_active": True, "co2_factor_kg": 0.5
    }, headers=admin_headers)
    cat1_id = cat1_resp.json()["id"]
    cat2_id = cat2_resp.json()["id"]
    
    # 2. Create request
    resp = client.post("/api/consumer/requests", json={
        "address_id": consumer_address["id"],
        "items": [
            {"category_id": cat1_id, "description": "1", "quantity": 1, "estimated_weight_kg": 0.5, "image_urls": []},
            {"category_id": cat2_id, "description": "2", "quantity": 1, "estimated_weight_kg": 1.0, "image_urls": []}
        ]
    }, headers=consumer_headers)
    req_data = resp.json()
    req_id = req_data["id"]
    item1_id = req_data["items"][0]["id"]
    item2_id = req_data["items"][1]["id"]
    
    # 3. Quote
    resp = client.post(f"/api/centre/requests/{req_id}/quote", json={
        "handling_charge": 0.0, "pickup_charge": 0.0
    }, headers=centre_headers)
    assert resp.json()["quotation"]["material_value"] == 275.0
    
    # 4. Accept
    client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={"payment_method": "CASH"}, headers=consumer_headers)
    
    # Partner steps
    client.post(f"/api/partner/requests/{req_id}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{req_id}/start", headers=partner_headers)
    
    db_session.expire_all()
    otp = db_session.query(CollectionRequest).filter(CollectionRequest.id == req_id).first().pickup_otp
    with patch('app.cashfree_payout.process_consumer_payout'):
        client.post(f"/api/partner/requests/{req_id}/verify-otp", json={
            "otp": otp,
            "items": [
                {"item_id": item1_id, "actual_weight_kg": 0.5},
                {"item_id": item2_id, "actual_weight_kg": 1.0}
            ]
        }, headers=partner_headers)
    
    client.post(f"/api/partner/requests/{req_id}/deliver", headers=partner_headers)
    client.post(f"/api/centre/requests/{req_id}/complete", headers=centre_headers)
    
    # 5. Verify 2 inventory items
    resp = client.get(f"/api/centre/inventory", headers=centre_headers)
    inv_items = [i for i in resp.json() if i["request_id"] == req_id]
    assert len(inv_items) == 2

def test_notifications_throughout_lifecycle(client, db_session, consumer_headers, centre_headers, consumer_address, category):
    resp_me = client.get("/api/auth/me", headers=consumer_headers)
    consumer_id = resp_me.json()["id"]
    
    initial_notif = db_session.query(Notification).filter(Notification.user_id == consumer_id).count()
    
    resp = client.post("/api/consumer/requests", json={
        "address_id": consumer_address["id"],
        "items": [{"category_id": category["id"], "description": "Old phone", "quantity": 1, "estimated_weight_kg": 0.5, "image_urls": []}]
    }, headers=consumer_headers)
    req_id = resp.json()["id"]
    
    client.post(f"/api/centre/requests/{req_id}/quote", json={"handling_charge": 0.0, "pickup_charge": 0.0}, headers=centre_headers)
    
    new_notif = db_session.query(Notification).filter(Notification.user_id == consumer_id).count()
    assert new_notif > initial_notif

def test_status_history_tracking(client, db_session, consumer_headers, centre_headers, partner_headers, consumer_address, category):
    resp = client.post("/api/consumer/requests", json={
        "address_id": consumer_address["id"],
        "items": [{"category_id": category["id"], "description": "1", "quantity": 1, "estimated_weight_kg": 0.5, "image_urls": []}]
    }, headers=consumer_headers)
    req_id = resp.json()["id"]
    item_id = resp.json()["items"][0]["id"]
    
    client.post(f"/api/centre/requests/{req_id}/quote", json={"handling_charge": 0.0, "pickup_charge": 0.0}, headers=centre_headers)
    client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={"payment_method": "CASH"}, headers=consumer_headers)
    client.post(f"/api/partner/requests/{req_id}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{req_id}/start", headers=partner_headers)
    
    db_session.expire_all()
    otp = db_session.query(CollectionRequest).filter(CollectionRequest.id == req_id).first().pickup_otp
    with patch('app.cashfree_payout.process_consumer_payout'):
        client.post(f"/api/partner/requests/{req_id}/verify-otp", json={
            "otp": otp, "items": [{"item_id": item_id, "actual_weight_kg": 0.5}]
        }, headers=partner_headers)
    
    client.post(f"/api/partner/requests/{req_id}/deliver", headers=partner_headers)
    client.post(f"/api/centre/requests/{req_id}/complete", headers=centre_headers)
    
    history = db_session.query(StatusHistory).filter(StatusHistory.request_id == req_id).order_by(StatusHistory.created_at).all()
    statuses = [h.status for h in history]
    
    expected = ["PENDING", "QUOTED", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP", "AT_CENTRE", "COMPLETED"]
    assert statuses == expected

def test_referral_rewards_in_lifecycle(client, db_session, category, centre_headers, partner_headers):
    # Consumer A
    client.post("/api/auth/register", json={
        "email": "a@test.com", "password": "password123", "full_name": "Consumer A", "role": "CONSUMER", "phone": "1"
    })
    resp_a = client.post("/api/auth/login", json={"email": "a@test.com", "password": "password123"})
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}
    
    user_a = db_session.query(User).filter(User.email == "a@test.com").first()
    ref_code = user_a.referral_code
    
    # Consumer B
    client.post("/api/auth/register", json={
        "email": "b@test.com", "password": "password123", "full_name": "Consumer B", "role": "CONSUMER", "phone": "2", "referral_code": ref_code
    })
    resp_b = client.post("/api/auth/login", json={"email": "b@test.com", "password": "password123"})
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}
    
    db_session.expire_all()
    user_a = db_session.query(User).filter(User.email == "a@test.com").first()
    user_b = db_session.query(User).filter(User.email == "b@test.com").first()
    
    assert user_a.reward_points == 50
    assert user_b.reward_points == 20
    
    resp_addr = client.post("/api/consumer/addresses", json={
        "label": "H", "street": "S", "city": "Delhi", "state": "D", "pincode": "1"
    }, headers=headers_b)
    addr_id = resp_addr.json()["id"]
    
    resp = client.post("/api/consumer/requests", json={
        "address_id": addr_id,
        "items": [{"category_id": category["id"], "description": "1", "quantity": 1, "estimated_weight_kg": 0.5, "image_urls": []}]
    }, headers=headers_b)
    req_id = resp.json()["id"]
    item_id = resp.json()["items"][0]["id"]
    
    client.post(f"/api/centre/requests/{req_id}/quote", json={"handling_charge": 0.0, "pickup_charge": 0.0}, headers=centre_headers)
    client.post(f"/api/consumer/requests/{req_id}/accept-quote", json={"payment_method": "CASH"}, headers=headers_b)
    client.post(f"/api/partner/requests/{req_id}/accept", headers=partner_headers)
    client.post(f"/api/partner/requests/{req_id}/start", headers=partner_headers)
    
    db_session.expire_all()
    otp = db_session.query(CollectionRequest).filter(CollectionRequest.id == req_id).first().pickup_otp
    with patch('app.cashfree_payout.process_consumer_payout'):
        client.post(f"/api/partner/requests/{req_id}/verify-otp", json={
            "otp": otp, "items": [{"item_id": item_id, "actual_weight_kg": 0.5}]
        }, headers=partner_headers)
    
    client.post(f"/api/partner/requests/{req_id}/deliver", headers=partner_headers)
    client.post(f"/api/centre/requests/{req_id}/complete", headers=centre_headers)
    
    db_session.expire_all()
    user_b = db_session.query(User).filter(User.email == "b@test.com").first()
    assert user_b.reward_points == 30 # 20 initial + 10 completion
