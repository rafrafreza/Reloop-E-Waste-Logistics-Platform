import pytest
from app.utils import (
    generate_otp,
    notify,
    log_status,
    log_audit,
    get_setting_float,
)
from app.models import Notification, StatusHistory, AuditLog, Setting, User, CollectionRequest

def test_generate_otp_format():
    otp = generate_otp()
    assert isinstance(otp, str)
    assert len(otp) == 6
    assert otp.isdigit()

def test_generate_otp_randomness():
    otps = {generate_otp() for _ in range(10)}
    assert len(otps) > 1

def test_notify_creates_notification(db_session):
    user = User(email="test_notify@test.com", hashed_password="pw", full_name="Test", role="CONSUMER", is_active=True)
    db_session.add(user)
    db_session.commit()
    
    notify(db_session, user_id=user.id, title="Test Title", message="Test Message", link="/test")
    db_session.commit()
    
    notification = db_session.query(Notification).filter_by(user_id=user.id).first()
    assert notification is not None
    assert notification.title == "Test Title"
    assert notification.message == "Test Message"
    assert notification.link == "/test"
    assert not notification.is_read

def test_log_status_creates_history(db_session):
    user = User(email="test_status@test.com", hashed_password="pw", full_name="Test", role="CONSUMER", is_active=True)
    db_session.add(user)
    db_session.commit()
    
    req = CollectionRequest(consumer_id=user.id, status="PENDING")
    db_session.add(req)
    db_session.commit()
    
    log_status(db_session, request_id=req.id, status="QUOTED", remarks="Got a quote")
    db_session.commit()
    
    history = db_session.query(StatusHistory).filter_by(request_id=req.id).first()
    assert history is not None
    assert history.status == "QUOTED"
    assert history.remarks == "Got a quote"

def test_log_audit_creates_record(db_session):
    user = User(email="test_audit@test.com", hashed_password="pw", full_name="Test", role="ADMIN", is_active=True)
    db_session.add(user)
    db_session.commit()
    
    log_audit(db_session, actor_id=user.id, action="TEST_ACTION", details="Some details")
    db_session.commit()
    
    audit = db_session.query(AuditLog).filter_by(actor_id=user.id).first()
    assert audit is not None
    assert audit.action == "TEST_ACTION"
    assert audit.details == "Some details"

def test_get_setting_float_default(db_session):
    val = get_setting_float(db_session, "missing_key", 42.5)
    assert val == 42.5

def test_get_setting_float_valid(db_session):
    setting = Setting(key="valid_key", value="15.5", description="Test")
    db_session.add(setting)
    db_session.commit()
    
    val = get_setting_float(db_session, "valid_key", 10.0)
    assert val == 15.5

def test_get_setting_float_invalid_value(db_session):
    setting = Setting(key="invalid_key", value="not_a_float", description="Test")
    db_session.add(setting)
    db_session.commit()
    
    val = get_setting_float(db_session, "invalid_key", 20.0)
    assert val == 20.0
