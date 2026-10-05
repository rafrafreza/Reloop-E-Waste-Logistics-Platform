import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.auth import hash_password
from app.database import DATABASE_URL, connect_args

def force_reset_admin():
    print("Connecting to database...")
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@reloop.com")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
        
        print(f"Target Admin Email: {admin_email}")
        
        admin = db.query(User).filter(User.email == admin_email.lower()).first()
        if not admin:
            print(f"User {admin_email} not found. Creating anew...")
            admin = User(
                email=admin_email.lower(),
                hashed_password=hash_password(admin_pass),
                full_name="System Admin",
                role="ADMIN",
                is_active=True
            )
            db.add(admin)
        else:
            print(f"User {admin_email} found. Forcing role to ADMIN and resetting password...")
            admin.role = "ADMIN"
            admin.is_active = True
            admin.hashed_password = hash_password(admin_pass)
            
        db.commit()
        print(f"SUCCESS! You can now log in with {admin_email} and the password you set in the environment.")
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    force_reset_admin()
