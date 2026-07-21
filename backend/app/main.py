from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import seed
from app.routers import admin, auth, centre, common, consumer, partner

app = FastAPI(
    title="Reloop API",
    description="E-waste pickup & recycling logistics platform (college project).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    seed.run()


app.include_router(auth.router)
app.include_router(common.router)
app.include_router(consumer.router)
app.include_router(centre.router)
app.include_router(partner.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
