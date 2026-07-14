from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, DECIMAL, DateTime, TIMESTAMP, func
from sqlalchemy.orm import relationship
import enum
from database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"
    DRIVER = "DRIVER"
    RECYCLING_COMPANY = "RECYCLING_COMPANY"

class StatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class User(Base):
    __tablename__ = "User"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    email = Column(String(64), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    phone_number = Column(String(15), unique=True, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    is_active = Column(Boolean, default=True)

    customer_profile = relationship("Customer", uselist=False, cascade="all, delete-orphan")
    driver_profile = relationship("Driver", uselist=False, cascade="all, delete-orphan")
    company_profile = relationship("Company", uselist=False, cascade="all, delete-orphan")

class Driver(Base):
    __tablename__ = "Driver"

    driver_id = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    vehicle_type = Column(String(32))
    vehicle_registration_number = Column(String(16), nullable=False)
    max_capacity_kg = Column(DECIMAL(10, 2))
    is_available = Column(Boolean, default=True)

class Company(Base):
    __tablename__ = "Company"

    company_id = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    certification_id = Column(String(100))
    address = Column(Text, nullable=False)
    city = Column(String(32))
    state = Column(String(32))
    postal_code = Column(String(8), nullable=False)

class Customer(Base):
    __tablename__ = "Customer"

    customer_id = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    address = Column(Text, nullable=False)
    city = Column(String(32))
    state = Column(String(32))
    postal_code = Column(String(8), nullable=False)

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    request_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(Integer, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(StatusEnum), default=StatusEnum.PENDING)
    pickup_address = Column(Text, nullable=False)
    latitude = Column(DECIMAL(3, 6))
    longitude = Column(DECIMAL(3, 6))
    scheduled_date = Column(DateTime, nullable=False)
    completed_date = Column(DateTime)
    total_estimated_weight_kg = Column(DECIMAL(10, 2))
    total_estimated_price = Column(DECIMAL(10, 2))
    notes = Column(Text)

    items = relationship("EWasteItem", backref="pickup_request", cascade="all, delete-orphan")

class EWasteItem(Base):
    __tablename__ = "e_waste_items"

    item_id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey("pickup_requests.request_id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(64))
    item_category = Column(String(32), nullable=False)
    width_cm = Column(DECIMAL(5, 2))
    length_cm = Column(DECIMAL(5, 2))
    height_cm = Column(DECIMAL(5, 2))
    estimated_weight_kg = Column(DECIMAL(5, 2))
    estimated_price = Column(DECIMAL(10, 2))
