from fastapi import APIRouter, Depends, HTTPException
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
)
from app.schemas import CollectionRequestOut, DashboardStats, OtpVerifyRequest
from app.utils import log_status, notify, to_request_out

router = APIRouter(prefix="/api/partner", tags=["partner"])
require_partner = require_role("PARTNER")

ACTIVE_STATUSES = ["ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP"]
HISTORY_STATUSES = ["AT_CENTRE", "COMPLETED"]


def _request_query(db: Session):
    return db.query(CollectionRequest).options(
        joinedload(CollectionRequest.consumer),
        joinedload(CollectionRequest.address),
        joinedload(CollectionRequest.centre),
        joinedload(CollectionRequest.items).joinedload(RequestItem.category),
        joinedload(CollectionRequest.items).joinedload(RequestItem.images),
        joinedload(CollectionRequest.quotation),
        joinedload(CollectionRequest.assignment).joinedload(Assignment.partner),
        joinedload(CollectionRequest.history),
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
    else:
        raise HTTPException(status_code=400, detail="scope must be active or history")

    reqs = q.order_by(CollectionRequest.updated_at.desc()).all()
    return [to_request_out(r) for r in reqs]


@router.get("/requests/{request_id}", response_model=CollectionRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    return to_request_out(_get_assigned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/start", response_model=CollectionRequestOut)
def start_pickup(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _get_assigned_request(db, request_id, user.id)
    if req.status != "ASSIGNED":
        raise HTTPException(status_code=400, detail="Pickup can only be started from the ASSIGNED state")

    req.status = "OUT_FOR_PICKUP"
    log_status(db, req.id, "OUT_FOR_PICKUP", "Pickup partner is on the way")
    notify(db, req.consumer_id, "Partner on the way",
           f"Your pickup partner is heading to your address for request #{req.id}.")
    db.commit()
    return to_request_out(_get_assigned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/verify-otp", response_model=CollectionRequestOut)
def verify_otp(request_id: int, payload: OtpVerifyRequest, db: Session = Depends(get_db), user: User = Depends(require_partner)):
    req = _get_assigned_request(db, request_id, user.id)
    if req.status != "OUT_FOR_PICKUP":
        raise HTTPException(status_code=400, detail="Start the pickup before verifying the handover OTP")
    if payload.otp != req.pickup_otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    items_by_id = {i.id: i for i in req.items}
    for entry in payload.items:
        item = items_by_id.get(entry.item_id)
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {entry.item_id} does not belong to this request")
        item.actual_weight_kg = entry.actual_weight_kg

    req.status = "PICKED_UP"
    log_status(db, req.id, "PICKED_UP", "OTP verified, items collected from consumer")
    notify(db, req.consumer_id, "Pickup completed",
           f"Your e-waste for request #{req.id} has been picked up successfully.")
    db.commit()
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
            weight_kg=item.actual_weight_kg or item.estimated_weight_kg,
            status="IN_STORAGE",
        ))

    req.status = "AT_CENTRE"
    log_status(db, req.id, "AT_CENTRE", "Delivered to segregation centre")

    partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
    if partner_profile:
        partner_profile.status = "AVAILABLE"

    if req.centre:
        notify(db, req.centre.user_id, "Shipment arrived",
               f"Request #{req.id} has arrived at the centre and is ready for final processing.")

    db.commit()
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
