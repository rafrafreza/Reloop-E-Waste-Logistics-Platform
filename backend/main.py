from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
from routers import auth, pickups, profile

# Create all database tables based on models
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="E-Waste Connect Backend API", version="1.0.0")

app.include_router(auth.router)
app.include_router(pickups.router)
app.include_router(profile.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to E-Waste Connect API"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Simple query to check db connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
