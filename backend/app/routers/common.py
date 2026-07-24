from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Category, CollectionRequest, InventoryItem, Notification, Setting, User
from app.schemas import CategoryOut, ImpactStats, NotificationOut

router = APIRouter(prefix="/api", tags=["common"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active == True).order_by(Category.name).all()  # noqa: E712


@router.get("/settings/public")
def public_settings(db: Session = Depends(get_db)):
    """Small public subset of settings needed by the storefront and by
    authenticated role dashboards (e.g. default quotation charges)."""
    keys = [
        "platform_name",
        "support_email",
        "support_phone",
        "service_cities",
        "default_handling_charge",
        "default_pickup_charge",
    ]
    rows = db.query(Setting).filter(Setting.key.in_(keys)).all()
    return {row.key: row.value for row in rows}


@router.get("/impact/public", response_model=ImpactStats)
def public_impact(db: Session = Depends(get_db)):
    """Aggregate, platform-wide environmental impact - shown on the public
    marketing site. No auth required; no per-user data exposed."""
    items = db.query(InventoryItem).options(joinedload(InventoryItem.category)).all()
    total_weight = sum(i.weight_kg for i in items)
    total_co2 = sum(i.weight_kg * (i.category.co2_factor_kg if i.category else 1.5) for i in items)
    completed_requests = db.query(CollectionRequest).filter(CollectionRequest.status == "COMPLETED").count()
    return ImpactStats(
        total_weight_kg=round(total_weight, 2),
        total_co2_saved_kg=round(total_co2, 2),
        total_requests_completed=completed_requests,
        total_items_recycled=len(items),
    )


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/notifications/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .count()
    )
    return {"count": count}


@router.post("/notifications/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.get(Notification, notification_id)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    note.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return {"ok": True}
