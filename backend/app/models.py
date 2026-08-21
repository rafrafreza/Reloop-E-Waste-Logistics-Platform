"""
SQLAlchemy ORM models for the Reloop e-waste logistics platform.

Roles: CONSUMER, PARTNER (pickup partner), CENTRE (segregation centre
staff), ADMIN.

Core workflow (CollectionRequest.status):
  PENDING -> QUOTED -> ACCEPTED -> ASSIGNED -> OUT_FOR_PICKUP
  -> PICKED_UP -> AT_CENTRE -> COMPLETED
  (or REJECTED / CANCELLED at various points)

Chain-of-custody workflow (InventoryItem.status), once a request reaches
AT_CENTRE and its items are logged into the warehouse:
  IN_STORAGE -> DISPATCHED (handed to a licensed recycler) -> RECYCLED
"""
import random
import string
from datetime import datetime, timezone

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
    return datetime.now(timezone.utc)


def generate_referral_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=7))


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

    # Gamification / growth
    referral_code: Mapped[str] = mapped_column(String(12), unique=True, index=True, default=generate_referral_code)
    referred_by: Mapped[str | None] = mapped_column(String(12), nullable=True)
    reward_points: Mapped[int] = mapped_column(Integer, default=0)

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
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
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
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    total_earnings: Mapped[float] = mapped_column(Float, default=0.0)
    upi_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user: Mapped["User"] = relationship(back_populates="centre_profile")


class PartnerProfile(Base):
    __tablename__ = "partner_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")
    # AVAILABLE | OFFLINE
    centre_id: Mapped[int | None] = mapped_column(ForeignKey("centre_profiles.id"), nullable=True)
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    total_earnings: Mapped[float] = mapped_column(Float, default=0.0)
    wallet_balance: Mapped[float] = mapped_column(Float, default=0.0)
    upi_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user: Mapped["User"] = relationship(back_populates="partner_profile")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str] = mapped_column(String(10), default="\U0001F50C")
    base_price_per_kg: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Rough estimated kg of CO2-equivalent emissions avoided per kg of this
    # category recycled responsibly rather than landfilled - editable by
    # admin, shown to consumers as an illustrative sustainability estimate.
    co2_factor_kg: Mapped[float] = mapped_column(Float, default=1.5)


class CollectionRequest(Base):
    __tablename__ = "collection_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    consumer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    centre_id: Mapped[int | None] = mapped_column(ForeignKey("centre_profiles.id"), nullable=True)
    # Retained for compatibility with older local SQLite databases. The
    # address snapshot below remains the source of truth for existing requests.
    address_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Snapshot of the consumer's address at request creation time.
    # Stored inline so the consumer can freely delete/edit their address book
    # without affecting existing requests.
    pickup_street: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    pickup_city: Mapped[str] = mapped_column(String(100), nullable=False, default="", index=True)
    pickup_state: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    pickup_pincode: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    pickup_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    pickup_lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    request_type: Mapped[str] = mapped_column(String(20), default="NORMAL")
    quote_accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pickup_otp: Mapped[str | None] = mapped_column(String(6), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(20), default="ONLINE")
    # ONLINE | CASH
    consumer_upi_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    consumer: Mapped["User"] = relationship(foreign_keys=[consumer_id])
    centre: Mapped["CentreProfile | None"] = relationship()
    items: Mapped[list["RequestItem"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    quotation: Mapped["Quotation | None"] = relationship(back_populates="request", uselist=False, cascade="all, delete-orphan")
    assignment: Mapped["Assignment | None"] = relationship(back_populates="request", uselist=False, cascade="all, delete-orphan")
    history: Mapped[list["StatusHistory"]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="StatusHistory.created_at")
    rating: Mapped["Rating | None"] = relationship(back_populates="request", uselist=False, cascade="all, delete-orphan")


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
    priority_surcharge: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    final_material_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    final_total_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    # PENDING | ACCEPTED | REJECTED
    # Informational only (does not affect the consumer payout above) -
    # snapshot of platform_fee_percent at quote time, for revenue reporting.
    platform_commission: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    request: Mapped["CollectionRequest"] = relationship(back_populates="quotation")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), unique=True, nullable=False)
    partner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    # Snapshot of the partner_pickup_fee setting at assignment time, so
    # later fee changes don't retroactively alter historical earnings.
    pickup_fee: Mapped[float] = mapped_column(Float, default=0.0)
    pickup_fee_status: Mapped[str] = mapped_column(String(20), default="PENDING")
    # PENDING | PAID (settled to partner wallet)

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
    dispatched_to: Mapped[str | None] = mapped_column(String(150), nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recycled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

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


class Rating(Base):
    """A consumer's rating of the partner and/or centre for one completed
    request. One row per request - both ratings are optional (a consumer
    might only want to rate one side)."""
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("collection_requests.id"), unique=True, nullable=False)
    consumer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    partner_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    partner_review: Mapped[str | None] = mapped_column(String(500), nullable=True)
    centre_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    centre_review: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    request: Mapped["CollectionRequest"] = relationship(back_populates="rating")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("collection_requests.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", index=True)
    # OPEN | IN_PROGRESS | RESOLVED | CLOSED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    request: Mapped["CollectionRequest | None"] = relationship()
    messages: Mapped[list["SupportMessage"]] = relationship(back_populates="ticket", cascade="all, delete-orphan", order_by="SupportMessage.created_at")

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    ticket: Mapped["SupportTicket"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship()


class AuditLog(Base):
    """Lightweight accountability trail for admin/state-changing actions -
    who did what, when. Not exhaustive, covers the actions that matter most
    for a marketplace operator to be able to answer "who changed this?"."""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    actor: Mapped["User | None"] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class Payout(Base):
    """Tracks every Cashfree payout transfer (consumer & partner)."""
    __tablename__ = "payouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("collection_requests.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    payout_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # CONSUMER | PARTNER
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False)
    # ONLINE | CASH
    upi_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Cashfree fields
    transfer_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    cashfree_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # PENDING | SUCCESS | FAILED | REVERSED | REJECTED | ERROR
    cashfree_status_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # e.g. "SUCCESS", "INVALID_ACCOUNT_FAIL", "INVALID_VPA", "EXCEPTION"
    beneficiary_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    # PENDING | PROCESSING | SUCCESS | FAILED | CASH_COLLECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    user: Mapped["User"] = relationship()
    request: Mapped["CollectionRequest | None"] = relationship()


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

class PasswordReset(Base):
    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    otp: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    user: Mapped["User"] = relationship()
