from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models import RoleEnum

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone_number: str
    role: RoleEnum

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone_number: str
    role: RoleEnum
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ProfileUpdate(BaseModel):
    # Shared optional fields for Customer and Company
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Driver specific
    vehicle_type: Optional[str] = None
    vehicle_registration_number: Optional[str] = None
    max_capacity_kg: Optional[float] = None
    is_available: Optional[bool] = None
    
    # Company specific
    certification_id: Optional[str] = None

class CustomerOut(BaseModel):
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: str
    class Config:
        from_attributes = True

class DriverOut(BaseModel):
    vehicle_type: Optional[str] = None
    vehicle_registration_number: str
    max_capacity_kg: Optional[float] = None
    is_available: bool
    class Config:
        from_attributes = True

class CompanyOut(BaseModel):
    certification_id: Optional[str] = None
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: str
    class Config:
        from_attributes = True

class UserProfileOut(UserOut):
    customer_profile: Optional[CustomerOut] = None
    driver_profile: Optional[DriverOut] = None
    company_profile: Optional[CompanyOut] = None

class EWasteItemBase(BaseModel):
    item_name: Optional[str] = None
    item_category: str
    width_cm: Optional[float] = None
    length_cm: Optional[float] = None
    height_cm: Optional[float] = None
    estimated_weight_kg: Optional[float] = None
    estimated_price: Optional[float] = None

class EWasteItemCreate(EWasteItemBase):
    pass

class EWasteItemOut(EWasteItemBase):
    item_id: int
    request_id: int
    class Config:
        from_attributes = True

class PickupRequestBase(BaseModel):
    pickup_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_date: datetime
    notes: Optional[str] = None

class PickupRequestCreate(PickupRequestBase):
    items: list[EWasteItemCreate]

class PickupRequestOut(PickupRequestBase):
    request_id: int
    customer_id: int
    driver_id: Optional[int] = None
    status: str
    completed_date: Optional[datetime] = None
    total_estimated_weight_kg: Optional[float] = None
    total_estimated_price: Optional[float] = None
    items: list[EWasteItemOut] = []
    
    class Config:
        from_attributes = True
