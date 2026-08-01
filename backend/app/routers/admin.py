from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Address,
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
    AdminAnalyticsOut,
    CategoryCreate,
    CategoryOut,
    CategoryWeightCount,
    CentreOut,
    CityAnalytics,
    CollectionRequestOut,
    DashboardStats,
    InventoryStatusCount,
    PartnerOut,
    RequestStatusCount,
    SettingOut,
    SettingUpdate,
    TrendDataPoint,
    UserOut,
    UserRoleCount,
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


@router.get("/analytics", response_model=AdminAnalyticsOut)
def analytics(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    # 1. Request status distribution
    statuses = ["PENDING", "QUOTED", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP", "AT_CENTRE", "COMPLETED", "REJECTED", "CANCELLED"]
    status_counts_db = dict(
        db.query(CollectionRequest.status, func.count(CollectionRequest.id))
        .group_by(CollectionRequest.status)
        .all()
    )
    status_dist = [
        RequestStatusCount(status=st, count=status_counts_db.get(st, 0))
        for st in statuses
    ]

    # 2. Collection & Revenue Trends
    all_requests = (
        db.query(CollectionRequest)
        .options(
            joinedload(CollectionRequest.items),
            joinedload(CollectionRequest.quotation)
        )
        .order_by(CollectionRequest.created_at.asc())
        .all()
    )

    trends_map = {}
    for r in all_requests:
        date_str = r.created_at.strftime("%Y-%m-%d") if r.created_at else "Unknown"
        if date_str not in trends_map:
            trends_map[date_str] = {"requests": 0, "weight_kg": 0.0, "revenue": 0.0}
        
        trends_map[date_str]["requests"] += 1
        
        req_weight = sum((item.actual_weight_kg or item.estimated_weight_kg or 0.0) for item in r.items)
        trends_map[date_str]["weight_kg"] += req_weight

        if r.quotation and r.status in ("COMPLETED", "AT_CENTRE", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP"):
            trends_map[date_str]["revenue"] += (r.quotation.handling_charge + r.quotation.pickup_charge)

    trends_list = [
        TrendDataPoint(
            date=d,
            requests=data["requests"],
            weight_kg=round(data["weight_kg"], 2),
            revenue=round(data["revenue"], 2)
        )
        for d, data in sorted(trends_map.items())
    ]

    # 3. Category Breakdown
    cat_items = (
        db.query(
            Category.name,
            func.sum(func.coalesce(RequestItem.actual_weight_kg, RequestItem.estimated_weight_kg, 0.0)),
            func.sum(RequestItem.quantity)
        )
        .join(RequestItem, Category.id == RequestItem.category_id)
        .group_by(Category.name)
        .all()
    )
    cat_breakdown = [
        CategoryWeightCount(
            category_name=c_name,
            weight_kg=round(w or 0.0, 2),
            item_count=int(q or 0)
        )
        for c_name, w, q in cat_items
    ]

    # 4. City Breakdown
    cities = db.query(Address.city).distinct().all()
    city_names = set([c[0] for c in cities if c[0]])
    centre_cities = db.query(CentreProfile.city).distinct().all()
    partner_cities = db.query(PartnerProfile.city).distinct().all()
    for c in centre_cities + partner_cities:
        if c[0]:
            city_names.add(c[0])

    city_analytics_list = []
    for city_name in sorted(city_names):
        req_count = (
            db.query(CollectionRequest)
            .join(Address, CollectionRequest.address_id == Address.id)
            .filter(Address.city == city_name)
            .count()
        )
        
        reqs_in_city = (
            db.query(CollectionRequest)
            .join(Address, CollectionRequest.address_id == Address.id)
            .options(joinedload(CollectionRequest.items))
            .filter(Address.city == city_name)
            .all()
        )
        city_weight = sum(
            (item.actual_weight_kg or item.estimated_weight_kg or 0.0)
            for r in reqs_in_city for item in r.items
        )

        partners_count = db.query(PartnerProfile).filter(PartnerProfile.city == city_name).count()
        centres_count = db.query(CentreProfile).filter(CentreProfile.city == city_name).count()

        city_analytics_list.append(
            CityAnalytics(
                city=city_name,
                requests=req_count,
                weight_kg=round(city_weight, 2),
                partners=partners_count,
                centres=centres_count
            )
        )

    # 5. User Role Distribution
    user_roles_db = (
        db.query(User.role, func.count(User.id))
        .group_by(User.role)
        .all()
    )
    user_roles = [
        UserRoleCount(role=role, count=count)
        for role, count in user_roles_db
    ]

    # 6. Inventory Status Breakdown
    inventory_db = (
        db.query(
            InventoryItem.status,
            func.sum(InventoryItem.weight_kg),
            func.count(InventoryItem.id)
        )
        .group_by(InventoryItem.status)
        .all()
    )
    inventory_breakdown = [
        InventoryStatusCount(
            status=status,
            weight_kg=round(w or 0.0, 2),
            count=cnt
        )
        for status, w, cnt in inventory_db
    ]

    return AdminAnalyticsOut(
        request_status_distribution=status_dist,
        collection_revenue_trends=trends_list,
        category_breakdown=cat_breakdown,
        city_breakdown=city_analytics_list,
        user_role_distribution=user_roles,
        inventory_status_breakdown=inventory_breakdown,
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
        joinedload(CollectionRequest.quotation),
        joinedload(CollectionRequest.assignment),
        joinedload(CollectionRequest.history),
    )
    if status:
        q = q.filter(CollectionRequest.status == status.upper())
    reqs = q.order_by(CollectionRequest.created_at.desc()).limit(200).all()
    return [to_request_out(r) for r in reqs]
