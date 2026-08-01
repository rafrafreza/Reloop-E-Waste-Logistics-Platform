from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import (
    Address,
    Assignment,
    AuditLog,
    Category,
    CentreProfile,
    CollectionRequest,
    InventoryItem,
    PartnerProfile,
    RequestItem,
    Setting,
    SupportTicket,
    User,
)
from app.schemas import (
    AdminAnalyticsOut,
    AuditLogOut,
    CategoryCreate,
    CategoryOut,
    CategoryWeightCount,
    CentreOut,
    CityAnalytics,
    CollectionRequestOut,
    DashboardStats,
    ImpactStats,
    InventoryStatusCount,
    PartnerOut,
    RequestStatusCount,
    RevenueBreakdown,
    RevenueStats,
    SettingOut,
    SettingUpdate,
    SupportTicketAdminUpdate,
    SupportTicketOut,
    TrendDataPoint,
    UserOut,
    UserRoleCount,
)
from app.utils import log_audit, notify, to_request_out

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
    log_audit(db, user.id, "USER_ACTIVATED" if target.is_active else "USER_DEACTIVATED",
              f"{target.role} account: {target.email}")
    if target.is_active and target.role in ("PARTNER", "CENTRE"):
        notify(db, target.id, "Account approved",
               "Your account has been reviewed and approved. You can now sign in and start working.")
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
    log_audit(db, user.id, "CATEGORY_CREATED", payload.name)
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
    log_audit(db, user.id, "CATEGORY_UPDATED", payload.name)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    log_audit(db, user.id, "CATEGORY_REMOVED", cat.name)
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
    log_audit(db, user.id, "SETTING_UPDATED", f"{key} = {payload.value}")
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
            avg_rating=p.avg_rating, rating_count=p.rating_count,
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
        joinedload(CollectionRequest.rating),
    )
    if status:
        q = q.filter(CollectionRequest.status == status.upper())
    reqs = q.order_by(CollectionRequest.created_at.desc()).limit(200).all()
    return [to_request_out(r) for r in reqs]


@router.get("/revenue", response_model=RevenueStats)
def revenue(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    completed = (
        db.query(CollectionRequest)
        .options(
            joinedload(CollectionRequest.quotation),
            joinedload(CollectionRequest.assignment),
            joinedload(CollectionRequest.centre),
        )
        .filter(CollectionRequest.status == "COMPLETED")
        .all()
    )

    def _empty():
        return {"material_value": 0.0, "handling_revenue": 0.0, "pickup_pool": 0.0,
                "partner_payouts": 0.0, "platform_commission": 0.0, "completed_count": 0}

    by_month = defaultdict(_empty)
    by_city = defaultdict(_empty)
    totals = _empty()

    for r in completed:
        if not r.quotation:
            continue
        q = r.quotation
        payout = r.assignment.payout_amount if r.assignment else 0.0
        month_key = r.updated_at.strftime("%Y-%m")
        city_key = r.centre.city if r.centre else "Unknown"

        for bucket in (totals, by_month[month_key], by_city[city_key]):
            bucket["material_value"] += q.material_value
            bucket["handling_revenue"] += q.handling_charge
            bucket["pickup_pool"] += q.pickup_charge
            bucket["partner_payouts"] += payout
            bucket["platform_commission"] += q.platform_commission
            bucket["completed_count"] += 1

    def _to_breakdown(label: str, d: dict) -> RevenueBreakdown:
        return RevenueBreakdown(
            label=label,
            material_value=round(d["material_value"], 2),
            handling_revenue=round(d["handling_revenue"], 2),
            pickup_pool=round(d["pickup_pool"], 2),
            partner_payouts=round(d["partner_payouts"], 2),
            platform_commission=round(d["platform_commission"], 2),
            completed_count=d["completed_count"],
        )

    return RevenueStats(
        total_material_value=round(totals["material_value"], 2),
        total_handling_revenue=round(totals["handling_revenue"] + totals["pickup_pool"], 2),
        total_partner_payouts=round(totals["partner_payouts"], 2),
        total_platform_commission=round(totals["platform_commission"], 2),
        completed_count=totals["completed_count"],
        by_period=[_to_breakdown(k, v) for k, v in sorted(by_month.items())],
        by_city=[_to_breakdown(k, v) for k, v in sorted(by_city.items())],
    )


@router.get("/impact", response_model=ImpactStats)
def impact(db: Session = Depends(get_db), user: User = Depends(require_admin)):
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


@router.get("/audit-log", response_model=list[AuditLogOut])
def audit_log(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    logs = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.actor))
        .order_by(AuditLog.created_at.desc())
        .limit(300)
        .all()
    )
    return [
        AuditLogOut(
            id=log.id, actor_id=log.actor_id, actor_name=log.actor.full_name if log.actor else "System",
            action=log.action, details=log.details, created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/support/tickets", response_model=list[SupportTicketOut])
def list_all_tickets(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    q = db.query(SupportTicket).options(joinedload(SupportTicket.user))
    if status:
        q = q.filter(SupportTicket.status == status.upper())
    tickets = q.order_by(SupportTicket.created_at.desc()).all()
    return [
        SupportTicketOut(
            id=t.id, user_id=t.user_id, user_name=t.user.full_name if t.user else None,
            user_role=t.user.role if t.user else None, request_id=t.request_id, subject=t.subject,
            message=t.message, status=t.status, admin_response=t.admin_response,
            created_at=t.created_at, updated_at=t.updated_at,
        )
        for t in tickets
    ]


@router.put("/support/tickets/{ticket_id}", response_model=SupportTicketOut)
def respond_to_ticket(ticket_id: int, payload: SupportTicketAdminUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    ticket = db.query(SupportTicket).options(joinedload(SupportTicket.user)).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = payload.status
    if payload.admin_response is not None:
        ticket.admin_response = payload.admin_response
    log_audit(db, user.id, "SUPPORT_TICKET_UPDATED", f"#{ticket.id} -> {payload.status}")
    notify(db, ticket.user_id, "Support ticket updated",
           f"Your ticket \"{ticket.subject}\" is now {payload.status.replace('_', ' ').title()}.",
           link="/support")
    db.commit()
    db.refresh(ticket)
    return SupportTicketOut(
        id=ticket.id, user_id=ticket.user_id, user_name=ticket.user.full_name if ticket.user else None,
        user_role=ticket.user.role if ticket.user else None, request_id=ticket.request_id, subject=ticket.subject,
        message=ticket.message, status=ticket.status, admin_response=ticket.admin_response,
        created_at=ticket.created_at, updated_at=ticket.updated_at,
    )
