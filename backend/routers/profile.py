from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("", response_model=schemas.UserProfileOut)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("", response_model=schemas.UserProfileOut)
def update_profile(
    profile_data: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.RoleEnum.CUSTOMER:
        profile = db.query(models.Customer).filter(models.Customer.customer_id == current_user.id).first()
        if not profile:
            profile = models.Customer(customer_id=current_user.id)
            db.add(profile)
        
        if profile_data.address is not None:
            profile.address = profile_data.address
        if profile_data.city is not None:
            profile.city = profile_data.city
        if profile_data.state is not None:
            profile.state = profile_data.state
        if profile_data.postal_code is not None:
            profile.postal_code = profile_data.postal_code

    elif current_user.role == models.RoleEnum.DRIVER:
        profile = db.query(models.Driver).filter(models.Driver.driver_id == current_user.id).first()
        if not profile:
            profile = models.Driver(driver_id=current_user.id)
            db.add(profile)
            
        if profile_data.vehicle_type is not None:
            profile.vehicle_type = profile_data.vehicle_type
        if profile_data.vehicle_registration_number is not None:
            profile.vehicle_registration_number = profile_data.vehicle_registration_number
        if profile_data.max_capacity_kg is not None:
            profile.max_capacity_kg = profile_data.max_capacity_kg
        if profile_data.is_available is not None:
            profile.is_available = profile_data.is_available

    elif current_user.role == models.RoleEnum.RECYCLING_COMPANY:
        profile = db.query(models.Company).filter(models.Company.company_id == current_user.id).first()
        if not profile:
            profile = models.Company(company_id=current_user.id)
            db.add(profile)
            
        if profile_data.certification_id is not None:
            profile.certification_id = profile_data.certification_id
        if profile_data.address is not None:
            profile.address = profile_data.address
        if profile_data.city is not None:
            profile.city = profile_data.city
        if profile_data.state is not None:
            profile.state = profile_data.state
        if profile_data.postal_code is not None:
            profile.postal_code = profile_data.postal_code
    
    db.commit()
    db.refresh(current_user)
    return current_user
