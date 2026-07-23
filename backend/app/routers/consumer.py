from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import Address, Category, CollectionRequest, RequestItem, RequestItemImage, User
from app.schemas import AddressCreate, AddressOut, CollectionRequestCreate, CollectionRequestOut
from app.utils import log_status, to_request_out

router = APIRouter(prefix="/api/consumer", tags=["consumer"])
require_consumer = require_role("CONSUMER")


def _request_query(db: Session):
    return db.query(CollectionRequest).options(
        joinedload(CollectionRequest.consumer),
        joinedload(CollectionRequest.address),
        joinedload(CollectionRequest.centre),
        joinedload(CollectionRequest.items).joinedload(RequestItem.category),
        joinedload(CollectionRequest.items).joinedload(RequestItem.images),
        joinedload(CollectionRequest.quotation),
        joinedload(CollectionRequest.assignment),
        joinedload(CollectionRequest.history),
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
    in_use = db.query(CollectionRequest).filter(
        CollectionRequest.address_id == address_id,
        CollectionRequest.status.notin_(["COMPLETED", "CANCELLED", "REJECTED"]),
    ).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete an address used by an active request")
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
        address_id=payload.address_id,
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
def accept_quote(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_consumer)):
    req = _get_owned_request(db, request_id, user.id)
    if req.status != "QUOTED":
        raise HTTPException(status_code=400, detail="This request does not have a pending quotation")

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
