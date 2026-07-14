from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import JWTError, jwt

import models, schemas, auth_utils
from database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def check_existing_user(user: schemas.UserCreate, db: Session):
    db_user_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user_phone = db.query(models.User).filter(models.User.phone_number == user.phone_number).first()
    if db_user_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

@router.post("/register/customer", response_model=schemas.UserOut)
def register_customer(user: schemas.CustomerCreate, db: Session = Depends(get_db)):
    check_existing_user(user, db)
    hashed_password = auth_utils.get_password_hash(user.password)
    
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        phone_number=user.phone_number,
        role=models.RoleEnum.CUSTOMER
    )
    db.add(new_user)
    db.flush()
    
    new_customer = models.Customer(
        customer_id=new_user.id,
        address=user.address,
        city=user.city,
        state=user.state,
        postal_code=user.postal_code
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/register/driver", response_model=schemas.UserOut)
def register_driver(user: schemas.DriverCreate, db: Session = Depends(get_db)):
    check_existing_user(user, db)
    hashed_password = auth_utils.get_password_hash(user.password)
    
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        phone_number=user.phone_number,
        role=models.RoleEnum.DRIVER
    )
    db.add(new_user)
    db.flush()
    
    new_driver = models.Driver(
        driver_id=new_user.id,
        vehicle_type=user.vehicle_type,
        vehicle_registration_number=user.vehicle_registration_number,
        max_capacity_kg=user.max_capacity_kg
    )
    db.add(new_driver)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/register/company", response_model=schemas.UserOut)
def register_company(user: schemas.CompanyCreate, db: Session = Depends(get_db)):
    check_existing_user(user, db)
    hashed_password = auth_utils.get_password_hash(user.password)
    
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        phone_number=user.phone_number,
        role=models.RoleEnum.RECYCLING_COMPANY
    )
    db.add(new_user)
    db.flush()
    
    new_company = models.Company(
        company_id=new_user.id,
        certification_id=user.certification_id,
        address=user.address,
        city=user.city,
        state=user.state,
        postal_code=user.postal_code
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not auth_utils.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserProfileOut)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user
