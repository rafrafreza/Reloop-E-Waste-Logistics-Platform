"""Pydantic schemas used for request validation and response serialization."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# Auth / Users
# ---------------------------------------------------------------------------

VALID_ROLES = {"CONSUMER", "PARTNER", "CENTRE", "ADMIN"}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = None
    role: str = "CONSUMER"

    # Partner-only
    vehicle_number: str | None = None
    # Centre-only
    centre_name: str | None = None
    address: str | None = None
    # Partner + Centre
    city: str | None = None
    # Optional referral code entered at signup
    referral_code: str | None = None

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {VALID_ROLES}")
        if v == "ADMIN":
            raise ValueError("Admin accounts cannot self-register")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    created_at: datetime
    referral_code: str
    reward_points: int

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileOut(UserOut):
    # Role-specific fields, populated only for the matching role.
    vehicle_number: str | None = None
    city: str | None = None
    centre_name: str | None = None
    address: str | None = None
    avg_rating: float | None = None
    rating_count: int | None = None
    total_earnings: float | None = None
    upi_id: str | None = None
    referral_count: int = 0
    status: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    # Partner-only
    vehicle_number: str | None = None
    # Centre-only
    centre_name: str | None = None
    address: str | None = None
    # Partner + Centre
    city: str | None = None
    upi_id: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------


class AddressCreate(BaseModel):
    label: str = "Home"
    street: str
    city: str
    state: str
    pincode: str
    lat: float | None = None
    lng: float | None = None
    is_default: bool = False


class AddressOut(AddressCreate):
    id: int

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


class CategoryCreate(BaseModel):
    name: str
    icon: str = "\U0001F50C"
    base_price_per_kg: float = 0.0
    is_active: bool = True
    co2_factor_kg: float = 1.5


class CategoryOut(CategoryCreate):
    id: int

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Requests / Items
# ---------------------------------------------------------------------------


class ImageUploadOut(BaseModel):
    url: str


class RequestItemCreate(BaseModel):
    category_id: int
    description: str | None = None
    quantity: int = 1
    estimated_weight_kg: float = 1.0
    length_cm: float | None = None
    breadth_cm: float | None = None
    height_cm: float | None = None
    image_urls: list[str] = []


class RequestItemOut(BaseModel):
    id: int
    category_id: int
    category_name: str | None = None
    description: str | None
    quantity: int
    estimated_weight_kg: float
    actual_weight_kg: float | None
    length_cm: float | None = None
    breadth_cm: float | None = None
    height_cm: float | None = None
    image_urls: list[str] = []

    class Config:
        from_attributes = True


class CollectionRequestCreate(BaseModel):
    address_id: int
    preferred_date: datetime | None = None
    notes: str | None = None
    items: list[RequestItemCreate]

    @field_validator("items")
    @classmethod
    def must_have_items(cls, v):
        if not v:
            raise ValueError("At least one item is required")
        return v


class AcceptQuoteRequest(BaseModel):
    payment_method: str = "ONLINE"
    upi_id: str | None = None

    @field_validator("payment_method")
    @classmethod
    def valid_method(cls, v: str) -> str:
        v = v.upper()
        if v not in {"ONLINE", "CASH"}:
            raise ValueError("payment_method must be ONLINE or CASH")
        return v


class QuotationOut(BaseModel):
    id: int
    material_value: float
    handling_charge: float
    pickup_charge: float
    total_amount: float
    status: str
    platform_commission: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class QuotationCreate(BaseModel):
    handling_charge: float = 0.0
    pickup_charge: float = 0.0


class StatusHistoryOut(BaseModel):
    status: str
    remarks: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentOut(BaseModel):
    partner_id: int
    partner_name: str | None = None
    partner_phone: str | None = None
    assigned_at: datetime
    pickup_fee: float = 0.0
    pickup_fee_status: str = "PENDING"

    class Config:
        from_attributes = True


class AddressBrief(BaseModel):
    street: str
    city: str
    state: str
    pincode: str
    lat: float | None = None
    lng: float | None = None

    class Config:
        from_attributes = True


class RatingOut(BaseModel):
    partner_rating: int | None = None
    partner_review: str | None = None
    centre_rating: int | None = None
    centre_review: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RatingCreate(BaseModel):
    partner_rating: int | None = Field(default=None, ge=1, le=5)
    partner_review: str | None = None
    centre_rating: int | None = Field(default=None, ge=1, le=5)
    centre_review: str | None = None

    @field_validator("partner_review", "centre_review")
    @classmethod
    def trim_review(cls, v):
        if v is not None:
            v = v.strip()[:500] or None
        return v


class CollectionRequestOut(BaseModel):
    id: int
    consumer_id: int
    consumer_name: str | None = None
    consumer_phone: str | None = None
    centre_id: int | None
    centre_name: str | None = None
    status: str
    preferred_date: datetime | None
    notes: str | None
    pickup_otp: str | None = None
    payment_method: str = "ONLINE"
    consumer_upi_id: str | None = None
    created_at: datetime
    updated_at: datetime
    # Inline address snapshot
    address: AddressBrief | None = None
    pickup_street: str = ""
    pickup_city: str = ""
    pickup_state: str = ""
    pickup_pincode: str = ""
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    items: list[RequestItemOut] = []
    quotation: QuotationOut | None = None
    assignment: AssignmentOut | None = None
    history: list[StatusHistoryOut] = []
    rating: RatingOut | None = None

    class Config:
        from_attributes = True


class OtpVerifyItem(BaseModel):
    item_id: int
    actual_weight_kg: float


class OtpVerifyRequest(BaseModel):
    otp: str
    items: list[OtpVerifyItem]


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Support tickets
# ---------------------------------------------------------------------------


class SupportTicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=5)
    request_id: int | None = None


class SupportTicketAdminUpdate(BaseModel):
    status: str
    admin_response: str | None = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        v = v.upper()
        if v not in {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}:
            raise ValueError("Invalid ticket status")
        return v


class SupportTicketOut(BaseModel):
    id: int
    user_id: int
    user_name: str | None = None
    user_role: str | None = None
    request_id: int | None
    subject: str
    message: str
    status: str
    admin_response: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


class SettingOut(BaseModel):
    key: str
    value: str
    description: str | None

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str


class CentreOut(BaseModel):
    id: int
    centre_name: str
    city: str
    address: str
    capacity_kg: float
    user_id: int
    avg_rating: float = 0.0
    rating_count: int = 0

    class Config:
        from_attributes = True


class PartnerOut(BaseModel):
    id: int
    user_id: int
    full_name: str | None = None
    phone: str | None = None
    vehicle_number: str | None
    city: str
    status: str
    avg_rating: float = 0.0
    rating_count: int = 0
    total_earnings: float = 0.0
    upi_id: str | None = None

    class Config:
        from_attributes = True


class InventoryItemOut(BaseModel):
    id: int
    request_id: int
    category_id: int
    category_name: str | None = None
    weight_kg: float
    status: str
    received_at: datetime
    dispatched_to: str | None = None
    dispatched_at: datetime | None = None
    recycled_at: datetime | None = None

    class Config:
        from_attributes = True


class InventoryDispatchRequest(BaseModel):
    item_ids: list[int]
    recycler_name: str = Field(min_length=2, max_length=150)


class InventoryRecycleRequest(BaseModel):
    item_ids: list[int]


class DashboardStats(BaseModel):
    total_users: int
    total_consumers: int
    total_partners: int
    total_centres: int
    total_requests: int
    pending_requests: int
    active_requests: int
    completed_requests: int
    total_weight_kg: float
    total_revenue: float


class CapacityStats(BaseModel):
    capacity_kg: float
    used_kg: float
    percent_used: float


class PartnerEarningsOut(BaseModel):
    total_earnings: float
    paid_earnings: float
    pending_earnings: float
    completed_jobs: int
    avg_rating: float
    rating_count: int


class RevenueBreakdown(BaseModel):
    label: str
    material_value: float
    handling_revenue: float
    pickup_pool: float
    partner_payouts: float
    platform_commission: float
    completed_count: int


class RevenueStats(BaseModel):
    total_material_value: float
    total_handling_revenue: float
    total_partner_payouts: float
    total_platform_commission: float
    completed_count: int
    by_period: list[RevenueBreakdown]
    by_city: list[RevenueBreakdown]


class ImpactStats(BaseModel):
    total_weight_kg: float
    total_co2_saved_kg: float
    total_requests_completed: int
    total_items_recycled: int


class AuditLogOut(BaseModel):
    id: int
    actor_id: int | None
    actor_name: str | None = None
    action: str
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True

class RequestStatusCount(BaseModel):
    status: str
    count: int


class TrendDataPoint(BaseModel):
    date: str
    requests: int
    weight_kg: float
    revenue: float


class CategoryWeightCount(BaseModel):
    category_name: str
    weight_kg: float
    item_count: int


class CityAnalytics(BaseModel):
    city: str
    requests: int
    weight_kg: float
    partners: int
    centres: int


class UserRoleCount(BaseModel):
    role: str
    count: int


class InventoryStatusCount(BaseModel):
    status: str
    weight_kg: float
    count: int


class AdminAnalyticsOut(BaseModel):
    request_status_distribution: list[RequestStatusCount]
    collection_revenue_trends: list[TrendDataPoint]
    category_breakdown: list[CategoryWeightCount]
    city_breakdown: list[CityAnalytics]
    user_role_distribution: list[UserRoleCount]
    inventory_status_breakdown: list[InventoryStatusCount]


class CentreCategoryWeight(BaseModel):
    category_name: str
    weight_kg: float
    item_count: int


class CentreInventoryStatus(BaseModel):
    status: str
    weight_kg: float
    count: int


class CentreTrendPoint(BaseModel):
    date: str
    requests: int
    weight_kg: float
    revenue: float


class CentrePartnerStatus(BaseModel):
    status: str
    count: int


class CentreAnalyticsOut(BaseModel):
    inventory_status_breakdown: list[CentreInventoryStatus]
    category_breakdown: list[CentreCategoryWeight]
    processing_trends: list[CentreTrendPoint]
    partner_status_distribution: list[CentrePartnerStatus]


# ---------------------------------------------------------------------------
# Payouts
# ---------------------------------------------------------------------------


class PayoutOut(BaseModel):
    id: int
    request_id: int | None
    user_id: int
    payout_type: str
    amount: float
    payment_method: str
    upi_id: str | None
    transfer_id: str | None
    cashfree_status: str | None
    cashfree_status_code: str | None = None
    beneficiary_id: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PayoutAdminOut(PayoutOut):
    user_name: str | None = None
    user_role: str | None = None
