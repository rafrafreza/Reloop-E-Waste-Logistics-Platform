from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(
    prefix="/pickups",
    tags=["Pickup Requests"]
)

@router.post("/", response_model=schemas.PickupRequestOut)
def create_pickup_request(
    request_data: schemas.PickupRequestCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can create pickup requests")
        
    total_weight = sum(item.estimated_weight_kg or 0 for item in request_data.items)
    total_price = sum(item.estimated_price or 0 for item in request_data.items)
    
    new_request = models.PickupRequest(
        customer_id=current_user.id,
        pickup_address=request_data.pickup_address,
        latitude=request_data.latitude,
        longitude=request_data.longitude,
        scheduled_date=request_data.scheduled_date,
        notes=request_data.notes,
        total_estimated_weight_kg=total_weight,
        total_estimated_price=total_price,
        status=models.StatusEnum.PENDING
    )
    db.add(new_request)
    db.flush()
    
    for item in request_data.items:
        db_item = models.EWasteItem(
            request_id=new_request.request_id,
            item_name=item.item_name,
            item_category=item.item_category,
            width_cm=item.width_cm,
            length_cm=item.length_cm,
            height_cm=item.height_cm,
            estimated_weight_kg=item.estimated_weight_kg,
            estimated_price=item.estimated_price
        )
        db.add(db_item)
        
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/", response_model=List[schemas.PickupRequestOut])
def get_pickup_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.RoleEnum.CUSTOMER:
        return db.query(models.PickupRequest).filter(models.PickupRequest.customer_id == current_user.id).all()
    elif current_user.role == models.RoleEnum.DRIVER:
        # Drivers can see pending requests or ones assigned to them
        return db.query(models.PickupRequest).filter(
            (models.PickupRequest.driver_id == current_user.id) | 
            (models.PickupRequest.status == models.StatusEnum.PENDING)
        ).all()
    elif current_user.role == models.RoleEnum.ADMIN:
        return db.query(models.PickupRequest).all()
    else:
        return []

@router.put("/{request_id}/status", response_model=schemas.PickupRequestOut)
def update_pickup_status(
    request_id: int, 
    status: models.StatusEnum,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.DRIVER and current_user.role != models.RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Only drivers and admins can update status")
        
    pickup = db.query(models.PickupRequest).filter(models.PickupRequest.request_id == request_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup request not found")
        
    if pickup.status == models.StatusEnum.PENDING and status != models.StatusEnum.PENDING and current_user.role == models.RoleEnum.DRIVER:
        pickup.driver_id = current_user.id
        
    pickup.status = status
    if status == models.StatusEnum.COMPLETED:
        pickup.completed_date = datetime.utcnow()
        
    db.commit()
    db.refresh(pickup)
    return pickup
