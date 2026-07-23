from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Category,
    CentreProfile,
    CollectionRequest,
    InventoryItem,
    PartnerProfile,
    RequestItem,
    Setting,
    User,
)
from app.schemas import (
    CategoryCreate,
    CategoryOut,
    CentreOut,
    CollectionRequestOut,
    DashboardStats,
    PartnerOut,
    SettingOut,
    SettingUpdate,
    UserOut,
)
from app.utils import to_request_out

router = APIRouter(prefix="/api/admin", tags=["admin"])
require_admin = require_role("ADMIN")


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    total_users = db.query(User).count()
    total_consumers = db.query(User).filter(User.role == "CONSUMER").count()
    total_partners = db.query(User).filter(User.role == "PARTNER").count()
    total_centres = db.query(User).filter(User.role == "CENTRE").count()

    total_requests = db.query(CollectionRequest).count()
    pending = db.query(CollectionRequest).filter(CollectionRequest.status == "PENDING").count()
    active = db.query(CollectionRequest).filter(
        CollectionRequest.status.in_(["QUOTED", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP", "AT_CENTRE"])
    ).count()
    completed = db.query(CollectionRequest).filter(CollectionRequest.status == "COMPLETED").count()

    total_weight = sum(i.weight_kg for i in db.query(InventoryItem).all())
    completed_reqs = db.query(CollectionRequest).options(joinedload(CollectionRequest.quotation)).filter(
        CollectionRequest.status == "COMPLETED"
    ).all()
    revenue = sum((r.quotation.handling_charge + r.quotation.pickup_charge) for r in completed_reqs if r.quotation)

    return DashboardStats(
        total_users=total_users, total_consumers=total_consumers, total_partners=total_partners,
        total_centres=total_centres, total_requests=total_requests, pending_requests=pending,
        active_requests=active, completed_requests=completed, total_weight_kg=round(total_weight, 2),
        total_revenue=round(revenue, 2),
    )


@router.get("/users", response_model=list[UserOut])
def list_users(role: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role.upper())
    return q.order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/toggle-active", response_model=UserOut)
def toggle_active(user_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "ADMIN":
        raise HTTPException(status_code=400, detail="Cannot deactivate another admin account")
    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return target


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return db.query(Category).order_by(Category.name).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    existing = db.query(Category).filter(Category.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    cat = Category(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in payload.model_dump().items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    in_use = db.query(RequestItem).filter(RequestItem.category_id == category_id).first()
    if in_use:
        cat.is_active = False
        db.commit()
        return
    db.delete(cat)
    db.commit()


@router.get("/settings", response_model=list[SettingOut])
def list_settings(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return db.query(Setting).order_by(Setting.key).all()


@router.put("/settings/{key}", response_model=SettingOut)
def update_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    setting.value = payload.value
    db.commit()
    db.refresh(setting)
    return setting


@router.get("/centres", response_model=list[CentreOut])
def list_centres(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return db.query(CentreProfile).order_by(CentreProfile.city).all()


@router.get("/partners", response_model=list[PartnerOut])
def list_partners(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    partners = db.query(PartnerProfile).options(joinedload(PartnerProfile.user)).all()
    return [
        PartnerOut(
            id=p.id, user_id=p.user_id, full_name=p.user.full_name, phone=p.user.phone,
            vehicle_number=p.vehicle_number, city=p.city, status=p.status,
        )
        for p in partners
    ]


@router.get("/requests", response_model=list[CollectionRequestOut])
def list_all_requests(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    q = db.query(CollectionRequest).options(
        joinedload(CollectionRequest.consumer),
        joinedload(CollectionRequest.address),
        joinedload(CollectionRequest.centre),
        joinedload(CollectionRequest.items).joinedload(RequestItem.category),
        joinedload(CollectionRequest.items).joinedload(RequestItem.images),
        joinedload(CollectionRequest.quotation),
        joinedload(CollectionRequest.assignment),
        joinedload(CollectionRequest.history),
    )
    if status:
        q = q.filter(CollectionRequest.status == status.upper())
    reqs = q.order_by(CollectionRequest.created_at.desc()).limit(200).all()
    return [to_request_out(r) for r in reqs]
