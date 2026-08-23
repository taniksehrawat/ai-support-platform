# backend/app/database/database.py
"""
SQLAlchemy engine and session configuration.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.app.config import settings

# SQLite engine (check_same_thread=False required for SQLite with FastAPI)
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False,  # set True for debugging SQL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session in routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()