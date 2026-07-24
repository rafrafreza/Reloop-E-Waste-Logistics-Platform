from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import CentreProfile, PartnerProfile, User
from app.schemas import (
    LoginRequest,
    PasswordChange,
    ProfileOut,
    ProfileUpdate,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.utils import notify

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if payload.role in ("PARTNER", "CENTRE") and not payload.city:
        raise HTTPException(status_code=400, detail="City is required for this role")
    if payload.role == "CENTRE" and not payload.centre_name:
        raise HTTPException(status_code=400, detail="Centre name is required")

    # Partner and Centre accounts require admin approval before they can
    # access their dashboard. Consumers (and Admins, who can't self-register)
    # are active immediately.
    requires_approval = payload.role in ("PARTNER", "CENTRE")

    # Optional referral bonus: if a valid code was entered, both the new
    # signup and the person who referred them get a small reward-points
    # bonus. An unrecognized code is ignored rather than blocking signup.
    referrer = None
    new_user_bonus = 0
    if payload.referral_code:
        referrer = db.query(User).filter(User.referral_code == payload.referral_code.strip().upper()).first()
        if referrer:
            new_user_bonus = 20

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        is_active=not requires_approval,
        referred_by=referrer.referral_code if referrer else None,
        reward_points=new_user_bonus,
    )
    db.add(user)
    db.flush()

    if payload.role == "CENTRE":
        db.add(CentreProfile(
            user_id=user.id,
            centre_name=payload.centre_name,
            city=payload.city,
            address=payload.address or "",
        ))
    elif payload.role == "PARTNER":
        db.add(PartnerProfile(
            user_id=user.id,
            vehicle_number=payload.vehicle_number,
            city=payload.city,
            status="AVAILABLE",
        ))

    if referrer:
        referrer.reward_points += 50
        notify(db, referrer.id, "Referral bonus earned",
               f"{user.full_name} joined Reloop using your referral code. You earned 50 points!")

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        if user.role in ("PARTNER", "CENTRE"):
            # Never issued a profile approval yet - distinct from being
            # deactivated after the fact, so the frontend can show a
            # dedicated "application under review" message.
            raise HTTPException(status_code=403, detail="PENDING_APPROVAL")
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact support.")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/token", include_in_schema=True)
def swagger_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Allows using the Swagger UI 'Authorize' button (OAuth2 form login)."""
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


def _serialize_profile(db: Session, user: User) -> ProfileOut:
    data = UserOut.model_validate(user).model_dump()
    if user.role == "PARTNER":
        profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == user.id).first()
        if profile:
            data["vehicle_number"] = profile.vehicle_number
            data["city"] = profile.city
            data["avg_rating"] = profile.avg_rating
            data["rating_count"] = profile.rating_count
            data["total_earnings"] = profile.total_earnings
            data["status"] = profile.status
    elif user.role == "CENTRE":
        profile = db.query(CentreProfile).filter(CentreProfile.user_id == user.id).first()
        if profile:
            data["centre_name"] = profile.centre_name
            data["address"] = profile.address
            data["city"] = profile.city
            data["avg_rating"] = profile.avg_rating
            data["rating_count"] = profile.rating_count

    data["referral_count"] = db.query(User).filter(User.referred_by == user.referral_code).count()
    return ProfileOut(**data)


@router.get("/profile", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _serialize_profile(db, current_user)


@router.put("/profile", response_model=ProfileOut)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone

    if current_user.role == "PARTNER":
        profile = db.query(PartnerProfile).filter(PartnerProfile.user_id == current_user.id).first()
        if profile:
            if payload.vehicle_number is not None:
                profile.vehicle_number = payload.vehicle_number
            if payload.city is not None:
                profile.city = payload.city
    elif current_user.role == "CENTRE":
        profile = db.query(CentreProfile).filter(CentreProfile.user_id == current_user.id).first()
        if profile:
            if payload.centre_name is not None:
                profile.centre_name = payload.centre_name
            if payload.address is not None:
                profile.address = payload.address
            if payload.city is not None:
                profile.city = payload.city

    db.commit()
    db.refresh(current_user)
    return _serialize_profile(db, current_user)


@router.put("/change-password")
def change_password(payload: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}
