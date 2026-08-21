from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Address, Category, CentreProfile, CollectionRequest, PartnerProfile, RequestItem, RequestItemImage, Setting, User
from app.schemas import CollectionRequestCreate, RequestItemCreate
from app.utils import log_status, notify


def validate_service_city(db: Session, city: str) -> None:
    setting = db.query(Setting).filter(Setting.key == "service_cities").first()
    if setting and setting.value:
        valid_cities = [value.strip().lower() for value in setting.value.split(",")]
        if city.strip().lower() not in valid_cities:
            raise HTTPException(status_code=400, detail="City is not serviceable")


def create_collection_request(db: Session, payload: CollectionRequestCreate, user: User) -> CollectionRequest:
    address = next((item for item in user.addresses if item.id == payload.address_id), None)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    categories = {}
    for item in payload.items:
        category = db.get(Category, item.category_id)
        if not category or not category.is_active:
            raise HTTPException(status_code=400, detail=f"Invalid category id {item.category_id}")
        categories[item.category_id] = category

    validate_service_city(db, address.city)
    request = CollectionRequest(
        consumer_id=user.id,
        address_id=address.id,
        pickup_street=address.street,
        pickup_city=address.city,
        pickup_state=address.state,
        pickup_pincode=address.pincode,
        pickup_lat=address.lat,
        pickup_lng=address.lng,
        status="PENDING",
        request_type=payload.request_type,
        notes=payload.notes,
    )
    db.add(request)
    db.flush()

    for item in payload.items:
        request_item = RequestItem(
            request_id=request.id,
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

    log_status(db, request.id, "PENDING", "Request created by consumer")
    total_items = sum(item.quantity for item in payload.items)
    total_weight = sum(item.estimated_weight_kg * item.quantity for item in payload.items)
    notifications = []
    for centre in db.query(CentreProfile).filter(CentreProfile.city == address.city).all():
        notifications.append(notify(db, centre.user_id, "New pickup request", f"New request #{request.id} in {address.city} - {total_items} item(s), ~{total_weight:.1f} kg", link=f"/centre/requests/{request.id}"))
    for partner in db.query(PartnerProfile).filter(PartnerProfile.city == address.city, PartnerProfile.status == "AVAILABLE").all():
        notifications.append(notify(db, partner.user_id, "New pickup request nearby", f"New request #{request.id} in {address.city} - {total_items} item(s), ~{total_weight:.1f} kg", link="/partner/available"))

    db.commit()
    from app.websocket import manager
    for notification in notifications:
        manager.push_sync(notification["user_id"], notification)
    return request


def update_collection_request(
    db: Session,
    request: CollectionRequest,
    user: User,
    *,
    address_id: int | None = None,
    request_type: str | None = None,
    notes: str | None = None,
    items: list[RequestItemCreate] | None = None,
) -> CollectionRequest:
    if request.consumer_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.status not in {"PENDING", "QUOTED"}:
        raise HTTPException(status_code=400, detail="Only pending or quoted requests can be updated")

    if address_id is not None:
        address = db.get(Address, address_id)
        if not address or address.user_id != user.id:
            raise HTTPException(status_code=404, detail="Address not found")
        validate_service_city(db, address.city)
        request.address_id = address.id
        request.pickup_street = address.street
        request.pickup_city = address.city
        request.pickup_state = address.state
        request.pickup_pincode = address.pincode
        request.pickup_lat = address.lat
        request.pickup_lng = address.lng

    if request_type is not None:
        normalized_type = request_type.upper()
        if normalized_type not in {"NORMAL", "PRIORITY"}:
            raise HTTPException(status_code=400, detail="request_type must be NORMAL or PRIORITY")
        request.request_type = normalized_type
    if notes is not None:
        request.notes = notes
    if items is not None:
        if not items:
            raise HTTPException(status_code=400, detail="At least one item is required")
        for item in items:
            category = db.get(Category, item.category_id)
            if not category or not category.is_active:
                raise HTTPException(status_code=400, detail=f"Invalid category id {item.category_id}")
        request.items.clear()
        for item in items:
            request.items.append(RequestItem(
                category_id=item.category_id,
                description=item.description,
                quantity=item.quantity,
                estimated_weight_kg=item.estimated_weight_kg,
                length_cm=item.length_cm,
                breadth_cm=item.breadth_cm,
                height_cm=item.height_cm,
                images=[RequestItemImage(url=url) for url in item.image_urls],
            ))

    log_status(db, request.id, request.status, "Request updated by consumer")
    db.commit()
    return request


def cancel_collection_request(db: Session, request: CollectionRequest, user: User) -> CollectionRequest:
    if request.consumer_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.status not in {"PENDING", "QUOTED"}:
        raise HTTPException(status_code=400, detail="Request can no longer be cancelled")
    request.status = "CANCELLED"
    if request.quotation:
        request.quotation.status = "REJECTED"
    log_status(db, request.id, "CANCELLED", "Cancelled by consumer")
    notification = None
    if request.centre_id and request.centre:
        notification = notify(db, request.centre.user_id, "Request cancelled", f"Request #{request.id} was cancelled by the consumer.", link=f"/centre/requests/{request.id}")
    db.commit()
    if notification:
        from app.websocket import manager
        manager.push_sync(notification["user_id"], notification)
    return request