import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, upgrade_schema
from app.routers import admin, auth, centre, chat, common, consumer, partner, support, uploads

app = FastAPI(
    title="Reloop API",
    description="E-waste pickup & recycling logistics platform (college project).",
    version="1.0.0",
)

# Build the list of allowed origins dynamically
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

# If Render provides a frontend URL, add it to the list!
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(os.path.join("uploads", "items"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def on_startup():
    import asyncio
    from app.websocket import manager
    try:
        manager.main_loop = asyncio.get_running_loop()
    except RuntimeError:
        pass
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    upgrade_schema()

    # Automatically create the first Admin account securely
    from app.database import SessionLocal
    from app.models import User
    from app.auth import hash_password
    import os

    db = SessionLocal()
    try:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@reloop.com")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
        
        # Ensure the specific admin requested in environment variables exists
        admin = db.query(User).filter(User.email == admin_email.lower()).first()
        if not admin:
            print(f"Provisioning requested admin account: {admin_email}")
            default_admin = User(
                email=admin_email.lower(),
                hashed_password=hash_password(admin_pass),
                full_name="System Admin",
                role="ADMIN",
                is_active=True
            )
            db.add(default_admin)
            db.commit()
        elif admin.role != "ADMIN":
            print(f"Upgrading existing user {admin_email} to ADMIN")
            admin.role = "ADMIN"
            db.commit()
    except Exception as e:
        print(f"Failed to seed admin: {e}")
    finally:
        db.close()

@app.get("/api/my-ip")
def get_my_ip():
    """Helper endpoint to get the current outbound IP for Cashfree whitelisting."""
    import httpx
    try:
        resp = httpx.get("https://api.ipify.org?format=json", timeout=10)
        return {"outbound_ip": resp.json().get("ip")}
    except Exception as e:
        return {"error": str(e)}


app.include_router(auth.router)
app.include_router(common.router)
app.include_router(consumer.router)
app.include_router(centre.router)
app.include_router(partner.router)
app.include_router(admin.router)
app.include_router(uploads.router)
app.include_router(chat.router)
app.include_router(support.router)

from app.routers import ws
app.include_router(ws.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}
