"""
Database configuration.

Uses SQLite for local development/college submission. Switching to
Postgres later only requires changing DATABASE_URL and removing the
`connect_args` sqlite-specific flag.
"""
import os
from sqlalchemy import create_engine, inspect, text
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


def upgrade_schema() -> None:
    """Add missing nullable columns to an existing local or hosted database.

    SQLAlchemy's create_all() creates tables but does not alter them. This
    small additive migration keeps existing data usable during development and
    deployment. Production databases should use a proper migration tool when
    schemas change more substantially.
    """
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table in Base.metadata.sorted_tables:
            if table.name not in inspector.get_table_names():
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue

                column_type = column.type.compile(dialect=engine.dialect)
                definition = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {column_type}'
                if not column.nullable:
                    default = column.default.arg if column.default and not callable(column.default.arg) else None
                    if isinstance(default, str):
                        default = "'" + default.replace("'", "''") + "'"
                    elif default is None:
                        default = "''" if column_type.upper().startswith(("VARCHAR", "TEXT", "CHAR")) else "0"
                    definition += f" NOT NULL DEFAULT {default}"
                if engine.dialect.name == "postgresql":
                    definition = definition.replace("ADD COLUMN", "ADD COLUMN IF NOT EXISTS", 1)
                connection.execute(text(definition))


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
