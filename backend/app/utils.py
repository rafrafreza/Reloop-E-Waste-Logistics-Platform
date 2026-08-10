"""Small shared helpers used across routers."""
import random

from sqlalchemy.orm import Session

from app.models import AuditLog, CollectionRequest, Notification, Setting, StatusHistory
from app.schemas import (
    AddressBrief,
    AssignmentOut,
    CollectionRequestOut,
    QuotationOut,
    RatingOut,
    RequestItemOut,
    StatusHistoryOut,
)


def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def notify(db: Session, user_id: int, title: str, message: str, link: str | None = None) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message, link=link))


def log_status(db: Session, request_id: int, status: str, remarks: str | None = None) -> None:
    db.add(StatusHistory(request_id=request_id, status=status, remarks=remarks))


def log_audit(db: Session, actor_id: int | None, action: str, details: str | None = None) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, details=details))


def get_setting_float(db: Session, key: str, default: float) -> float:
    """Reads a numeric setting value, falling back safely if missing/unparseable."""
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row:
        return default
    try:
        return float(row.value)
    except (TypeError, ValueError):
        return default


def to_request_out(req: CollectionRequest) -> CollectionRequestOut:
    """Serialize a CollectionRequest ORM object into the API response shape,
    including a few denormalized display fields (names) for convenience."""
    items = [
        RequestItemOut(
            id=i.id,
            category_id=i.category_id,
            category_name=i.category.name if i.category else None,
            description=i.description,
            quantity=i.quantity,
            estimated_weight_kg=i.estimated_weight_kg,
            actual_weight_kg=i.actual_weight_kg,
            length_cm=i.length_cm,
            breadth_cm=i.breadth_cm,
            height_cm=i.height_cm,
            image_urls=[img.url for img in i.images],
        )
        for i in req.items
    ]

    quotation = QuotationOut.model_validate(req.quotation) if req.quotation else None

    assignment = None
    if req.assignment:
        assignment = AssignmentOut(
            partner_id=req.assignment.partner_id,
            partner_name=req.assignment.partner.full_name if req.assignment.partner else None,
            partner_phone=req.assignment.partner.phone if req.assignment.partner else None,
            assigned_at=req.assignment.assigned_at,
            pickup_fee=req.assignment.pickup_fee,
            pickup_fee_status=req.assignment.pickup_fee_status,
        )

    history = [StatusHistoryOut.model_validate(h) for h in req.history]
    rating = RatingOut.model_validate(req.rating) if req.rating else None

    # Build AddressBrief from the inline snapshot fields
    address = AddressBrief(
        street=req.pickup_street,
        city=req.pickup_city,
        state=req.pickup_state,
        pincode=req.pickup_pincode,
        lat=req.pickup_lat,
        lng=req.pickup_lng,
    ) if req.pickup_street else None

    return CollectionRequestOut(
        id=req.id,
        consumer_id=req.consumer_id,
        consumer_name=req.consumer.full_name if req.consumer else None,
        consumer_phone=req.consumer.phone if req.consumer else None,
        centre_id=req.centre_id,
        centre_name=req.centre.centre_name if req.centre else None,
        status=req.status,
        preferred_date=req.preferred_date,
        notes=req.notes,
        pickup_otp=req.pickup_otp,
        payment_method=req.payment_method,
        consumer_upi_id=req.consumer_upi_id,
        created_at=req.created_at,
        updated_at=req.updated_at,
        address=address,
        pickup_street=req.pickup_street,
        pickup_city=req.pickup_city,
        pickup_state=req.pickup_state,
        pickup_pincode=req.pickup_pincode,
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        items=items,
        quotation=quotation,
        assignment=assignment,
        history=history,
        rating=rating,
    )
