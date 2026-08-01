from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Address,
    Assignment,
    Category,
    CentreProfile,
    CollectionRequest,
    InventoryItem,
    PartnerProfile,
    Quotation,
    RequestItem,
    User,
)
from app.schemas import (
    AssignPartnerRequest,
    CapacityStats,
    CentreAnalyticsOut,
    CentreCategoryWeight,
    CentreInventoryStatus,
    CentrePartnerStatus,
    CentreTrendPoint,
    CollectionRequestOut,
    DashboardStats,
    InventoryDispatchRequest,
    InventoryItemOut,
    InventoryRecycleRequest,
    PartnerOut,
    QuotationCreate,
)
from app.utils import get_setting_float, log_status, notify, to_request_out

router = APIRouter(prefix="/api/centre", tags=["centre"])
require_centre = require_role("CENTRE")


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
        joinedload(CollectionRequest.rating),
    )


def _get_my_centre(db: Session, user: User) -> CentreProfile:
    centre = db.query(CentreProfile).filter(CentreProfile.user_id == user.id).first()
    if not centre:
        raise HTTPException(status_code=400, detail="No centre profile associated with this account")
    return centre


ACTIVE_STATUSES = ["QUOTED", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP", "AT_CENTRE"]
HISTORY_STATUSES = ["COMPLETED", "CANCELLED", "REJECTED"]


@router.get("/requests", response_model=list[CollectionRequestOut])
def list_requests(scope: str = "pending", db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    q = _request_query(db)

    if scope == "pending":
        q = (
            q.join(Address, CollectionRequest.address_id == Address.id)
            .filter(CollectionRequest.status == "PENDING", Address.city == centre.city)
        )
    elif scope == "active":
        q = q.filter(CollectionRequest.centre_id == centre.id, CollectionRequest.status.in_(ACTIVE_STATUSES))
    elif scope == "history":
        q = q.filter(CollectionRequest.centre_id == centre.id, CollectionRequest.status.in_(HISTORY_STATUSES))
    else:
        raise HTTPException(status_code=400, detail="scope must be pending, active or history")

    reqs = q.order_by(CollectionRequest.created_at.desc()).all()
    return [to_request_out(r) for r in reqs]


@router.get("/requests/{request_id}", response_model=CollectionRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.centre_id is not None and req.centre_id != centre.id:
        raise HTTPException(status_code=403, detail="This request belongs to another centre")
    return to_request_out(req)


@router.post("/requests/{request_id}/quote", response_model=CollectionRequestOut)
def create_quotation(request_id: int, payload: QuotationCreate, db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="This request has already been quoted or claimed")
    if req.address.city != centre.city:
        raise HTTPException(status_code=400, detail="This request is outside your centre's service city")

    material_value = sum(
        item.estimated_weight_kg * item.category.base_price_per_kg for item in req.items
    )
    total = material_value - payload.handling_charge - payload.pickup_charge

    fee_percent = get_setting_float(db, "platform_fee_percent", 5.0)
    commission = material_value * fee_percent / 100

    quotation = Quotation(
        request_id=req.id,
        material_value=round(material_value, 2),
        handling_charge=round(payload.handling_charge, 2),
        pickup_charge=round(payload.pickup_charge, 2),
        total_amount=round(total, 2),
        platform_commission=round(commission, 2),
        status="PENDING",
    )
    db.add(quotation)
    req.status = "QUOTED"
    req.centre_id = centre.id
    log_status(db, req.id, "QUOTED", f"Quotation of Rs.{total:.2f} generated by {centre.centre_name}")
    notify(db, req.consumer_id, "Quotation ready",
           f"Your quotation for request #{req.id} is ready: Rs.{total:.2f}",
           link=f"/consumer/requests/{req.id}")

    db.commit()
    return to_request_out(_request_query(db).filter(CollectionRequest.id == request_id).first())



@router.post("/requests/{request_id}/complete", response_model=CollectionRequestOut)
def complete_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req or req.centre_id != centre.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "AT_CENTRE":
        raise HTTPException(status_code=400, detail="Request must have arrived at the centre before it can be completed")

    req.status = "COMPLETED"
    log_status(db, req.id, "COMPLETED", "Processing complete, payout settled")
    notify(db, req.consumer_id, "Request completed",
           f"Request #{req.id} is complete. Thank you for recycling responsibly!")

    # Reward the consumer with a small points bonus for completing a pickup.
    if req.consumer:
        req.consumer.reward_points += 10

    if req.assignment:
        partner_profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == req.assignment.partner_id).first()
        if partner_profile:
            partner_profile.status = "AVAILABLE"
            partner_profile.total_earnings += req.assignment.payout_amount
        req.assignment.payout_status = "PAID"
        notify(db, req.assignment.partner_id, "Payout settled",
               f"Rs.{req.assignment.payout_amount:.2f} for request #{req.id} has been added to your earnings.")

    db.commit()
    return to_request_out(_request_query(db).filter(CollectionRequest.id == request_id).first())


def _inventory_out(i: InventoryItem) -> InventoryItemOut:
    return InventoryItemOut(
        id=i.id, request_id=i.request_id, category_id=i.category_id,
        category_name=i.category.name if i.category else None,
        weight_kg=i.weight_kg, status=i.status, received_at=i.received_at,
        dispatched_to=i.dispatched_to, dispatched_at=i.dispatched_at, recycled_at=i.recycled_at,
    )


@router.get("/inventory", response_model=list[InventoryItemOut])
def list_inventory(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    q = (
        db.query(InventoryItem)
        .options(joinedload(InventoryItem.category))
        .filter(InventoryItem.centre_id == centre.id)
    )
    if status:
        q = q.filter(InventoryItem.status == status.upper())
    items = q.order_by(InventoryItem.received_at.desc()).all()
    return [_inventory_out(i) for i in items]


@router.post("/inventory/dispatch", response_model=list[InventoryItemOut])
def dispatch_inventory(payload: InventoryDispatchRequest, db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.id.in_(payload.item_ids), InventoryItem.centre_id == centre.id)
        .all()
    )
    if not items:
        raise HTTPException(status_code=404, detail="No matching inventory items found")
    now = datetime.utcnow()
    for item in items:
        if item.status != "IN_STORAGE":
            raise HTTPException(status_code=400, detail=f"Item #{item.id} is not in storage")
        item.status = "DISPATCHED"
        item.dispatched_to = payload.recycler_name
        item.dispatched_at = now
    db.commit()
    return [_inventory_out(i) for i in items]


@router.post("/inventory/recycle", response_model=list[InventoryItemOut])
def recycle_inventory(payload: InventoryRecycleRequest, db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.id.in_(payload.item_ids), InventoryItem.centre_id == centre.id)
        .all()
    )
    if not items:
        raise HTTPException(status_code=404, detail="No matching inventory items found")
    now = datetime.utcnow()
    for item in items:
        if item.status != "DISPATCHED":
            raise HTTPException(status_code=400, detail=f"Item #{item.id} must be dispatched before it can be marked recycled")
        item.status = "RECYCLED"
        item.recycled_at = now
    db.commit()
    return [_inventory_out(i) for i in items]


@router.get("/capacity", response_model=CapacityStats)
def capacity(db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    used = (
        db.query(InventoryItem)
        .filter(InventoryItem.centre_id == centre.id, InventoryItem.status == "IN_STORAGE")
        .all()
    )
    used_kg = sum(i.weight_kg for i in used)
    percent = (used_kg / centre.capacity_kg * 100) if centre.capacity_kg else 0
    return CapacityStats(capacity_kg=centre.capacity_kg, used_kg=round(used_kg, 2), percent_used=round(percent, 1))


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)
    base = db.query(CollectionRequest).filter(CollectionRequest.centre_id == centre.id)
    total = base.count()
    pending_count = (
        db.query(CollectionRequest)
        .join(Address, CollectionRequest.address_id == Address.id)
        .filter(CollectionRequest.status == "PENDING", Address.city == centre.city)
        .count()
    )
    active = base.filter(CollectionRequest.status.in_(ACTIVE_STATUSES)).count()
    completed = base.filter(CollectionRequest.status == "COMPLETED").count()
    weight = db.query(InventoryItem).filter(InventoryItem.centre_id == centre.id).all()
    total_weight = sum(i.weight_kg for i in weight)
    revenue = sum(
        (r.quotation.handling_charge + r.quotation.pickup_charge)
        for r in base.filter(CollectionRequest.status == "COMPLETED").all() if r.quotation
    )

    return DashboardStats(
        total_users=0,
        total_consumers=0,
        total_partners=db.query(PartnerProfile).filter(PartnerProfile.city == centre.city).count(),
        total_centres=0,
        total_requests=total,
        pending_requests=pending_count,
        active_requests=active,
        completed_requests=completed,
        total_weight_kg=round(total_weight, 2),
        total_revenue=round(revenue, 2),
    )


@router.get("/analytics", response_model=CentreAnalyticsOut)
def analytics(db: Session = Depends(get_db), user: User = Depends(require_centre)):
    centre = _get_my_centre(db, user)

    # 1. Inventory Status Breakdown
    inventory_statuses = ["IN_STORAGE", "DISPATCHED", "RECYCLED"]
    inv_items = db.query(InventoryItem).filter(InventoryItem.centre_id == centre.id).all()
    inv_map = {st: {"weight": 0.0, "count": 0} for st in inventory_statuses}
    for item in inv_items:
        st = item.status if item.status in inv_map else "IN_STORAGE"
        inv_map[st]["weight"] += item.weight_kg
        inv_map[st]["count"] += 1

    inv_breakdown = [
        CentreInventoryStatus(
            status=st,
            weight_kg=round(inv_map[st]["weight"], 2),
            count=inv_map[st]["count"]
        )
        for st in inventory_statuses
    ]

    # 2. Category Breakdown for Centre's requests / inventory
    cat_items = (
        db.query(
            Category.name,
            func.sum(func.coalesce(RequestItem.actual_weight_kg, RequestItem.estimated_weight_kg, 0.0)),
            func.sum(RequestItem.quantity)
        )
        .join(RequestItem, Category.id == RequestItem.category_id)
        .join(CollectionRequest, RequestItem.request_id == CollectionRequest.id)
        .filter(CollectionRequest.centre_id == centre.id)
        .group_by(Category.name)
        .all()
    )

    if not cat_items:
        all_cats = db.query(Category).all()
        cat_breakdown = [
            CentreCategoryWeight(category_name=c.name, weight_kg=0.0, item_count=0)
            for c in all_cats
        ]
    else:
        cat_breakdown = [
            CentreCategoryWeight(
                category_name=c_name,
                weight_kg=round(w or 0.0, 2),
                item_count=int(q or 0)
            )
            for c_name, w, q in cat_items
        ]

    # 3. Processing Trends (Time-series)
    centre_requests = (
        db.query(CollectionRequest)
        .options(
            joinedload(CollectionRequest.items),
            joinedload(CollectionRequest.quotation)
        )
        .filter(CollectionRequest.centre_id == centre.id)
        .order_by(CollectionRequest.created_at.asc())
        .all()
    )

    trends_map = {}
    for r in centre_requests:
        date_str = r.created_at.strftime("%Y-%m-%d") if r.created_at else "Unknown"
        if date_str not in trends_map:
            trends_map[date_str] = {"requests": 0, "weight_kg": 0.0, "revenue": 0.0}

        trends_map[date_str]["requests"] += 1
        req_weight = sum((item.actual_weight_kg or item.estimated_weight_kg or 0.0) for item in r.items)
        trends_map[date_str]["weight_kg"] += req_weight

        if r.quotation and r.status in ("COMPLETED", "AT_CENTRE", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP"):
            trends_map[date_str]["revenue"] += (r.quotation.handling_charge + r.quotation.pickup_charge)

    trends_list = [
        CentreTrendPoint(
            date=d,
            requests=data["requests"],
            weight_kg=round(data["weight_kg"], 2),
            revenue=round(data["revenue"], 2)
        )
        for d, data in sorted(trends_map.items())
    ]

    # 4. Partner Status Distribution in centre's city
    partner_statuses = ["AVAILABLE", "BUSY", "INACTIVE"]
    partners = (
        db.query(PartnerProfile)
        .join(User, PartnerProfile.user_id == User.id)
        .filter(PartnerProfile.city == centre.city)
        .all()
    )
    partner_map = {st: 0 for st in partner_statuses}
    for p in partners:
        st = p.status if p.status in partner_map else "AVAILABLE"
        partner_map[st] += 1

    partner_dist = [
        CentrePartnerStatus(status=st, count=partner_map[st])
        for st in partner_statuses
    ]

    return CentreAnalyticsOut(
        inventory_status_breakdown=inv_breakdown,
        category_breakdown=cat_breakdown,
        processing_trends=trends_list,
        partner_status_distribution=partner_dist
    )

