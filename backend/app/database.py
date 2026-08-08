"""
Database configuration.

Uses SQLite for local development/college submission. Switching to
Postgres later only requires changing DATABASE_URL and removing the
`connect_args` sqlite-specific flag.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Read from environment, default to sqlite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ewaste.db")

# 2. Render uses 'postgres://' but SQLAlchemy requires 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Only add SQLite connect_args if actually using SQLite
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
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
