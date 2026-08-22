from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Assignment,
    CollectionRequest,
    InventoryItem,
    PartnerProfile,
    RequestItem,
    User,
    Address,
)
from app.schemas import CollectionRequestOut, DashboardStats, OtpVerifyRequest, PartnerEarningsOut, UpdateWeightsRequest
from app.utils import log_status, notify, to_request_out, get_setting_float

router = APIRouter(prefix="/api/partner", tags=["partner"])
require_partner = require_role("PARTNER")

ACTIVE_STATUSES = ["ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP"]
HISTORY_STATUSES = ["AT_CENTRE", "COMPLETED"]


def _request_query(db: Session):
    return db.query(CollectionRequest).options(
        joinedload(CollectionRequest.consumer),
        joinedload(CollectionRequest.centre),
        joinedload(CollectionRequest.items).joinedload(RequestItem.category),
        joinedload(CollectionRequest.items).joinedload(RequestItem.images),
        joinedload(CollectionRequest.quotation),
        joinedload(CollectionRequest.assignment).joinedload(Assignment.partner),
        joinedload(CollectionRequest.history),
        joinedload(CollectionRequest.rating),
    )


def _get_assigned_request(db: Session, request_id: int, partner_user_id: int) -> CollectionRequest:
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req or not req.assignment or req.assignment.partner_id != partner_user_id:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


@router.get("/requests", response_model=list[CollectionRequestOut])
def list_requests(scope: str = "active", db: Session = Depends(get_db), user: User = Depends(require_partner)):
    q = _request_query(db).join(Assignment, CollectionRequest.id == Assignment.request_id).filter(
        Assignment.partner_id == user.id
    )
    if scope == "active":
        q = q.filter(CollectionRequest.status.in_(ACTIVE_STATUSES))
    elif scope == "history":
        q = q.filter(CollectionRequest.status.in_(HISTORY_STATUSES))
    elif scope != "all":
        raise HTTPException(status_code=400, detail="scope must be active, history, or all")

    reqs = q.order_by(CollectionRequest.updated_at.desc()).all()
    return [to_request_out(r) for r in reqs]


@router.get("/available-requests", response_model=list[CollectionRequestOut])
def list_available_requests(db: Session = Depends(get_db), user: User = Depends(require_partner)):
    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if not partner_profile:
        raise HTTPException(status_code=400, detail="Partner profile not found")
        
    q = _request_query(db).filter(
        CollectionRequest.status == "ACCEPTED",
        CollectionRequest.pickup_city == partner_profile.city
    )
    reqs = q.order_by(CollectionRequest.updated_at.desc()).all()
    return [to_request_out(r) for r in reqs]


@router.post("/requests/{request_id}/accept", response_model=CollectionRequestOut)
def accept_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if not partner_profile:
        raise HTTPException(status_code=400, detail="Partner profile not found")
        
    if partner_profile.status == "OFFLINE":
        raise HTTPException(status_code=400, detail="You must be online to accept a request")
        
    from app.utils import get_setting_int
    max_concurrent = get_setting_int(db, "partner_max_concurrent_requests", 10)
    
    current_active = db.query(CollectionRequest).join(Assignment).filter(
        Assignment.partner_id == user.id,
        CollectionRequest.status.in_(["ASSIGNED", "OUT_FOR_PICKUP"])
    ).count()
    
    if current_active >= max_concurrent:
        raise HTTPException(status_code=400, detail=f"You have reached the maximum concurrent requests cap ({max_concurrent}). Complete some pickups first.")
        
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "ACCEPTED":
        raise HTTPException(status_code=400, detail="This request is no longer available to be accepted")
        
    # ensure it's in their city
    if req.pickup_city != partner_profile.city:
        raise HTTPException(status_code=400, detail="This request is outside your service city")
        
    from app.utils import generate_otp
    otp = generate_otp()
    
    # Partner payout = Pickup charge (from quote) + Priority surcharge (from quote)
    payout = 0.0
    if req.quotation:
        payout = req.quotation.pickup_charge or 0.0
        if req.request_type == "PRIORITY":
            payout += (req.quotation.priority_surcharge or 0.0)
    
    if req.assignment:
        req.assignment.partner_id = user.id
        req.assignment.pickup_fee = round(payout, 2)
        req.assignment.assigned_at = datetime.now(timezone.utc)
    else:
        db.add(Assignment(request_id=req.id, partner_id=user.id, pickup_fee=round(payout, 2)))

    req.status = "ASSIGNED"
    req.pickup_otp = otp
    partner_profile.status = "BUSY"
    
    log_status(db, req.id, "ASSIGNED", f"Accepted by pickup partner {user.full_name}")
    notif_payload = notify(db, req.consumer_id, "Pickup partner assigned",
           f"{user.full_name} has accepted your request #{req.id} and is now assigned. Your handover OTP is {otp}.",
           link=f"/consumer/requests/{req.id}")
           
    db.commit()
    if notif_payload:
        from app.websocket import manager
        try:
            manager.push_sync(notif_payload["user_id"], notif_payload)
        except Exception:
            pass
    return to_request_out(_request_query(db).filter(CollectionRequest.id == request_id).first())


@router.get("/requests/{request_id}", response_model=CollectionRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    # Allowed if it is assigned to this partner
    if req.assignment and req.assignment.partner_id == user.id:
        return to_request_out(req)
        
    # Allowed if it is unassigned (ACCEPTED) and in this partner's city
    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if req.status == "ACCEPTED" and partner_profile and req.pickup_city == partner_profile.city:
        return to_request_out(req)
        
    raise HTTPException(status_code=404, detail="Request not found or not available")


@router.post("/requests/{request_id}/start", response_model=CollectionRequestOut)
def start_pickup(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _get_assigned_request(db, request_id, user.id)
    if req.status != "ASSIGNED":
        raise HTTPException(status_code=400, detail="Pickup can only be started from the ASSIGNED state")

    req.status = "OUT_FOR_PICKUP"
    log_status(db, req.id, "OUT_FOR_PICKUP", "Pickup partner is on the way")
    notif_payload = notify(db, req.consumer_id, "Partner on the way",
           f"Your pickup partner is heading to your address for request #{req.id}.")
    db.commit()
    if notif_payload:
        from app.websocket import manager
        manager.push_sync(notif_payload["user_id"], notif_payload)
    return to_request_out(_get_assigned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/weights", response_model=CollectionRequestOut)
def update_weights(request_id: int, payload: UpdateWeightsRequest, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _get_assigned_request(db, request_id, user.id)
    if req.status != "OUT_FOR_PICKUP":
        raise HTTPException(status_code=400, detail="Pickup must be started before updating weights")

    items_by_id = {i.id: i for i in req.items}
    for entry in payload.items:
        item = items_by_id.get(entry.item_id)
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {entry.item_id} does not belong to this request")
        item.actual_weight_kg = entry.actual_weight_kg

    if req.quotation:
        new_material_value = 0.0
        for item in req.items:
            weight = item.actual_weight_kg if item.actual_weight_kg is not None else item.estimated_weight_kg
            if item.category:
                new_material_value += weight * item.quantity * item.category.base_price_per_kg
        
        req.quotation.final_material_value = round(new_material_value, 2)
        new_total = new_material_value - req.quotation.handling_charge - req.quotation.pickup_charge - req.quotation.priority_surcharge
        req.quotation.final_total_amount = max(0.0, round(new_total, 2))

    log_status(db, req.id, "OUT_FOR_PICKUP", "Actual weights updated for consumer review")
    notif_payload = notify(db, req.consumer_id, "Payout updated",
           f"Your partner has captured the actual weight. Please review your updated payout.")
    db.commit()
    if notif_payload:
        from app.websocket import manager
        manager.push_sync(notif_payload["user_id"], notif_payload)
    return to_request_out(_get_assigned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/verify-otp", response_model=CollectionRequestOut)
def verify_otp(request_id: int, payload: OtpVerifyRequest, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _get_assigned_request(db, request_id, user.id)
    if req.status != "OUT_FOR_PICKUP":
        raise HTTPException(status_code=400, detail="Start the pickup before verifying the handover OTP")
    if payload.otp != req.pickup_otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    if payload.items:
        items_by_id = {item.id: item for item in req.items}
        for entry in payload.items:
            item = items_by_id.get(entry.item_id)
            if not item:
                raise HTTPException(status_code=400, detail=f"Item {entry.item_id} does not belong to this request")
            item.actual_weight_kg = entry.actual_weight_kg
        if req.quotation:
            actual_material_value = sum(
                (item.actual_weight_kg if item.actual_weight_kg is not None else item.estimated_weight_kg)
                * item.quantity
                * (item.category.base_price_per_kg if item.category else 0)
                for item in req.items
            )
            req.quotation.final_material_value = round(actual_material_value, 2)
            req.quotation.material_value = round(actual_material_value, 2)
            req.quotation.final_total_amount = max(0.0, round(
                actual_material_value
                - req.quotation.handling_charge
                - req.quotation.pickup_charge
                - req.quotation.priority_surcharge,
                2,
            ))

    req.status = "PICKED_UP"
    log_status(db, req.id, "PICKED_UP", "OTP verified, items collected from consumer")
    notif_payload = notify(db, req.consumer_id, "Pickup completed",
           f"Your e-waste for request #{req.id} has been picked up successfully.")

    # Trigger consumer payout
    from app.cashfree_payout import process_consumer_payout
    payout_notif = process_consumer_payout(db, req)

    db.commit()
    if notif_payload or payout_notif:
        from app.websocket import manager
        if notif_payload: manager.push_sync(notif_payload["user_id"], notif_payload)
        if payout_notif: manager.push_sync(payout_notif["user_id"], payout_notif)
    return to_request_out(_get_assigned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/deliver", response_model=CollectionRequestOut)
def deliver_to_centre(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _get_assigned_request(db, request_id, user.id)
    if req.status != "PICKED_UP":
        raise HTTPException(status_code=400, detail="Items must be picked up before delivering to the centre")

    for item in req.items:
        db.add(InventoryItem(
            centre_id=req.centre_id,
            request_id=req.id,
            category_id=item.category_id,
            weight_kg=(item.actual_weight_kg if item.actual_weight_kg is not None else item.estimated_weight_kg) * item.quantity,
            status="IN_STORAGE",
        ))

    req.status = "AT_CENTRE"
    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if partner_profile:
        partner_profile.status = "AVAILABLE"
    log_status(db, req.id, "AT_CENTRE", "Delivered to segregation centre")

    notif_payload = None
    if req.centre:
        notif_payload = notify(db, req.centre.user_id, "Shipment arrived",
               f"Request #{req.id} has arrived at the centre and is ready for final processing.")

    db.commit()
    if notif_payload:
        from app.websocket import manager
        manager.push_sync(notif_payload["user_id"], notif_payload)
    return to_request_out(_get_assigned_request(db, request_id, user.id))


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_partner)):
    q = db.query(CollectionRequest).join(Assignment, CollectionRequest.id == Assignment.request_id).filter(
        Assignment.partner_id == user.id
    )
    total = q.count()
    active = q.filter(CollectionRequest.status.in_(ACTIVE_STATUSES)).count()
    completed = q.filter(CollectionRequest.status.in_(["AT_CENTRE", "COMPLETED"])).count()

    completed_reqs = q.filter(CollectionRequest.status.in_(["AT_CENTRE", "COMPLETED"])).options(
        joinedload(CollectionRequest.items)
    ).all()
    total_weight = sum(
        (item.actual_weight_kg or 0) for r in completed_reqs for item in r.items
    )

    return DashboardStats(
        total_users=0, total_consumers=0, total_partners=0, total_centres=0,
        total_requests=total, pending_requests=0, active_requests=active,
        completed_requests=completed, total_weight_kg=round(total_weight, 2), total_revenue=0,
    )


@router.patch("/availability")
def set_availability(available: bool, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No partner profile associated with this account")
    if not available and db.query(CollectionRequest).join(Assignment).filter(
        Assignment.partner_id == user.id,
        CollectionRequest.status.in_(["ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP"]),
    ).first():
        raise HTTPException(status_code=400, detail="Cannot go offline while you have an active job")
    profile.status = "AVAILABLE" if available else "OFFLINE"
    db.commit()
    return {"status": profile.status}


@router.get("/earnings", response_model=PartnerEarningsOut)
def earnings(db: Session = Depends(get_db), user: User = Depends(require_partner)):
    profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="No partner profile associated with this account")

    pending_assignments = (
        db.query(Assignment)
        .filter(Assignment.partner_id == user.id, Assignment.pickup_fee_status == "PENDING")
        .all()
    )
    pending_total = sum(a.pickup_fee for a in pending_assignments)
    completed_jobs = (
        db.query(Assignment)
        .filter(Assignment.partner_id == user.id, Assignment.pickup_fee_status == "PAID")
        .count()
    )

    return PartnerEarningsOut(
        total_earnings=round(profile.total_earnings + pending_total, 2),
        paid_earnings=round(profile.total_earnings, 2),
        pending_earnings=round(pending_total, 2),
        wallet_balance=round(profile.wallet_balance, 2),
        completed_jobs=completed_jobs,
        avg_rating=profile.avg_rating,
        rating_count=profile.rating_count,
    )
