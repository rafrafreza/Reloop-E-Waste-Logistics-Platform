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
