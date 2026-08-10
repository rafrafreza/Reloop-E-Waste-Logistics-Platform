from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Address,
    Category,
    CollectionRequest,
    PartnerProfile,
    Rating,
    RequestItem,
    RequestItemImage,
    User,
)
from app.schemas import AcceptQuoteRequest, AddressCreate, AddressOut, CollectionRequestCreate, CollectionRequestOut, ImpactStats, RatingCreate
from app.utils import log_status, to_request_out

router = APIRouter(prefix="/api/consumer", tags=["consumer"])
require_consumer = require_role("CONSUMER")


def _request_query(db: Session):
    return db.query(CollectionRequest).options(
        joinedload(CollectionRequest.consumer),
        joinedload(CollectionRequest.centre),
        joinedload(CollectionRequest.items).joinedload(RequestItem.category),
        joinedload(CollectionRequest.items).joinedload(RequestItem.images),
        joinedload(CollectionRequest.quotation),
        joinedload(CollectionRequest.assignment),
        joinedload(CollectionRequest.history),
        joinedload(CollectionRequest.rating),
    )


def _get_owned_request(db: Session, request_id: int, consumer_id: int) -> CollectionRequest:
    req = _request_query(db).filter(CollectionRequest.id == request_id).first()
    if not req or req.consumer_id != consumer_id:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------


@router.get("/addresses", response_model=list[AddressOut])
def list_addresses(db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    return db.query(Address).filter(Address.user_id == user.id).order_by(Address.is_default.desc()).all()


@router.post("/addresses", response_model=AddressOut, status_code=201)
def create_address(payload: AddressCreate, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    if payload.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    addr = Address(user_id=user.id, **payload.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.put("/addresses/{address_id}", response_model=AddressOut)
def update_address(address_id: int, payload: AddressCreate, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    addr = db.get(Address, address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    if payload.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    for k, v in payload.model_dump().items():
        setattr(addr, k, v)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/addresses/{address_id}", status_code=204)
def delete_address(address_id: int, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    addr = db.get(Address, address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    # Address data is already snapshotted into existing requests, so we can
    # safely delete the address row at any time.
    db.delete(addr)
    db.commit()


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


@router.post("/requests", response_model=CollectionRequestOut, status_code=201)
def create_request(payload: CollectionRequestCreate, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    addr = db.get(Address, payload.address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")

    for item in payload.items:
        cat = db.get(Category, item.category_id)
        if not cat:
            raise HTTPException(status_code=400, detail=f"Invalid category id {item.category_id}")

    req = CollectionRequest(
        consumer_id=user.id,
        # Snapshot address fields so the request is never broken by address edits/deletes
        pickup_street=addr.street,
        pickup_city=addr.city,
        pickup_state=addr.state,
        pickup_pincode=addr.pincode,
        pickup_lat=addr.lat,
        pickup_lng=addr.lng,
        status="PENDING",
        preferred_date=payload.preferred_date,
        notes=payload.notes,
    )
    db.add(req)
    db.flush()

    for item in payload.items:
        request_item = RequestItem(
            request_id=req.id,
            category_id=item.category_id,
            description=item.description,
            quantity=item.quantity,
            estimated_weight_kg=item.estimated_weight_kg,
            length_cm=item.length_cm,
            breadth_cm=item.breadth_cm,
            height_cm=item.height_cm,
        )
        db.add(request_item)
        db.flush()
        for url in item.image_urls:
            db.add(RequestItemImage(request_item_id=request_item.id, url=url))

    log_status(db, req.id, "PENDING", "Request created by consumer")
    db.commit()

    return to_request_out(_get_owned_request(db, req.id, user.id))


@router.get("/requests", response_model=list[CollectionRequestOut])
def list_requests(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    q = _request_query(db).filter(CollectionRequest.consumer_id == user.id)
    if status:
        q = q.filter(CollectionRequest.status == status)
    reqs = q.order_by(CollectionRequest.created_at.desc()).all()
    return [to_request_out(r) for r in reqs]


@router.get("/requests/{request_id}", response_model=CollectionRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    return to_request_out(_get_owned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/accept-quote", response_model=CollectionRequestOut)
def accept_quote(
    request_id: int,
    payload: AcceptQuoteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_consumer),
):
    req = _get_owned_request(db, request_id, user.id)
    if req.status != "QUOTED":
        raise HTTPException(status_code=400, detail="This request does not have a pending quotation")

    if payload.payment_method == "ONLINE" and not payload.upi_id:
        raise HTTPException(status_code=400, detail="UPI ID is required for online payment")

    req.payment_method = payload.payment_method
    req.consumer_upi_id = payload.upi_id if payload.payment_method == "ONLINE" else None
    req.status = "ACCEPTED"
    req.quotation.status = "ACCEPTED"
    log_status(db, req.id, "ACCEPTED", "Consumer accepted the quotation")

    if req.centre:
        from app.utils import notify
        notify(db, req.centre.user_id, "Quotation accepted",
               f"Request #{req.id} quotation was accepted. Please assign a pickup partner.",
               link=f"/centre/requests/{req.id}")

    db.commit()
    return to_request_out(_get_owned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/reject-quote", response_model=CollectionRequestOut)
def reject_quote(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    req = _get_owned_request(db, request_id, user.id)
    if req.status != "QUOTED":
        raise HTTPException(status_code=400, detail="This request does not have a pending quotation")

    req.status = "REJECTED"
    req.quotation.status = "REJECTED"
    log_status(db, req.id, "REJECTED", "Consumer rejected the quotation")

    if req.centre:
        from app.utils import notify
        notify(db, req.centre.user_id, "Quotation rejected",
               f"Request #{req.id} quotation was rejected by the consumer.")

    db.commit()
    return to_request_out(_get_owned_request(db, request_id, user.id))


@router.post("/requests/{request_id}/cancel", response_model=CollectionRequestOut)
def cancel_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    req = _get_owned_request(db, request_id, user.id)
    if req.status not in ("PENDING", "QUOTED"):
        raise HTTPException(status_code=400, detail="Request can no longer be cancelled at this stage")

    req.status = "CANCELLED"
    log_status(db, req.id, "CANCELLED", "Cancelled by consumer")
    db.commit()
    return to_request_out(_get_owned_request(db, request_id, user.id))


@router.get("/impact", response_model=ImpactStats)
def my_impact(db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    completed = (
        db.query(CollectionRequest)
        .options(joinedload(CollectionRequest.items).joinedload(RequestItem.category))
        .filter(CollectionRequest.consumer_id == user.id, CollectionRequest.status == "COMPLETED")
        .all()
    )
    total_weight = 0.0
    total_co2 = 0.0
    item_count = 0
    for r in completed:
        for item in r.items:
            weight = item.actual_weight_kg or item.estimated_weight_kg
            co2_factor = item.category.co2_factor_kg if item.category else 1.5
            total_weight += weight
            total_co2 += weight * co2_factor
            item_count += item.quantity

    return ImpactStats(
        total_weight_kg=round(total_weight, 2),
        total_co2_saved_kg=round(total_co2, 2),
        total_requests_completed=len(completed),
        total_items_recycled=item_count,
    )


@router.post("/requests/{request_id}/rate", response_model=CollectionRequestOut)
def rate_request(request_id: int, payload: RatingCreate, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    req = _get_owned_request(db, request_id, user.id)
    if req.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="You can only rate a completed request")
    if req.rating:
        raise HTTPException(status_code=400, detail="This request has already been rated")
    if payload.partner_rating is None and payload.centre_rating is None:
        raise HTTPException(status_code=400, detail="Provide at least one rating")
    if payload.partner_rating is not None and not req.assignment:
        raise HTTPException(status_code=400, detail="This request has no assigned partner to rate")

    rating = Rating(
        request_id=req.id,
        consumer_id=user.id,
        partner_rating=payload.partner_rating,
        partner_review=payload.partner_review,
        centre_rating=payload.centre_rating,
        centre_review=payload.centre_review,
    )
    db.add(rating)

    if payload.partner_rating is not None and req.assignment:
        profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == req.assignment.partner_id).first()
        if profile:
            total = profile.avg_rating * profile.rating_count + payload.partner_rating
            profile.rating_count += 1
            profile.avg_rating = round(total / profile.rating_count, 2)

    if payload.centre_rating is not None and req.centre:
        centre = req.centre
        total = centre.avg_rating * centre.rating_count + payload.centre_rating
        centre.rating_count += 1
        centre.avg_rating = round(total / centre.rating_count, 2)

    db.commit()
    return to_request_out(_get_owned_request(db, request_id, user.id))
