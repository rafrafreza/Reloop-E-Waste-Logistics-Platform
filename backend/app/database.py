"""
Database configuration.

Uses SQLite for local development/college submission. Switching to
Postgres later only requires changing DATABASE_URL and removing the
`connect_args` sqlite-specific flag.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./ewaste.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed only for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
