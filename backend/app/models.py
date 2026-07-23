"""
SQLAlchemy ORM models for the Reloop e-waste logistics platform.

Roles: CONSUMER, PARTNER (pickup partner), CENTRE (segregation centre
staff), ADMIN.

Core workflow (CollectionRequest.status):
  PENDING -> QUOTED -> ACCEPTED -> ASSIGNED -> OUT_FOR_PICKUP
  -> PICKED_UP -> AT_CENTRE -> COMPLETED
  (or REJECTED / CANCELLED at various points)
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def now_utc() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # CONSUMER | PARTNER | CENTRE | ADMIN
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    addresses: Mapped[list["Address"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    partner_profile: Mapped["PartnerProfile | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    centre_profile: Mapped["CentreProfile | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(50), default="Home")
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="addresses")


class CentreProfile(Base):
    __tablename__ = "centre_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    centre_name: Mapped[str] = mapped_column(String(150), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), default="")
    capacity_kg: Mapped[float] = mapped_column(Float, default=5000.0)

    user: Mapped["User"] = relationship(back_populates="centre_profile")


class PartnerProfile(Base):
    __tablename__ = "partner_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")
    # AVAILABLE | BUSY | OFFLINE
    centre_id: Mapped[int | None] = mapped_column(ForeignKey("centre_profiles.id"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="partner_profile")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str] = mapped_column(String(10), default="\U0001F50C")
    base_price_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CollectionRequest(Base):
    __tablename__ = "collection_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    consumer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    address_id: Mapped[int] = mapped_column(ForeignKey("addresses.id"), nullable=False)
    centre_id: Mapped[int | None] = mapped_column(ForeignKey("centre_profiles.id"), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    preferred_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pickup_otp: Mapped[str | None] = mapped_column(String(6), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    consumer: Mapped["User"] = relationship(foreign_keys=[consumer_id])
    address: Mapped["Address"] = relationship()
    centre: Mapped["CentreProfile | None"] = relationship()
    items: Mapped[list["RequestItem"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    quotation: Mapped["Quotation | None"] = relationship(back_populates="request", uselist=False, cascade="all, delete-orphan")
    assignment: Mapped["Assignment | None"] = relationship(back_populates="request", uselist=False, cascade="all, delete-orphan")
    history: Mapped[list["StatusHistory"]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="StatusHistory.created_at")


class RequestItem(Base):
    __tablename__ = "request_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    estimated_weight_kg: Mapped[float] = mapped_column(Float, default=1.0)
    actual_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Rough item dimensions (cm), used by pickup partners to judge vehicle
    # size needed - optional since consumers may not always know them.
    length_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    breadth_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)

    request: Mapped["CollectionRequest"] = relationship(back_populates="items")
    category: Mapped["Category"] = relationship()
    images: Mapped[list["RequestItemImage"]] = relationship(back_populates="item", cascade="all, delete-orphan")


class RequestItemImage(Base):
    __tablename__ = "request_item_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_item_id: Mapped[int] = mapped_column(ForeignKey("request_items.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    item: Mapped["RequestItem"] = relationship(back_populates="images")


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), unique=True, nullable=False)
    material_value: Mapped[float] = mapped_column(Float, default=0.0)
    handling_charge: Mapped[float] = mapped_column(Float, default=0.0)
    pickup_charge: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    # PENDING | ACCEPTED | REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    request: Mapped["CollectionRequest"] = relationship(back_populates="quotation")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), unique=True, nullable=False)
    partner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    request: Mapped["CollectionRequest"] = relationship(back_populates="assignment")
    partner: Mapped["User"] = relationship()


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    centre_id: Mapped[int] = mapped_column(ForeignKey("centre_profiles.id"), nullable=False)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="IN_STORAGE")
    # IN_STORAGE | DISPATCHED | RECYCLED
    received_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    category: Mapped["Category"] = relationship()
    centre: Mapped["CentreProfile"] = relationship()


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    request: Mapped["CollectionRequest"] = relationship(back_populates="history")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
