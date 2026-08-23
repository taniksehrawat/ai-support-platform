# backend/app/config.py
"""
Application settings using Pydantic BaseSettings.
Reads from environment variables / .env file.
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Support Platform"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./support.db"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-a-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Qdrant (local)
    QDRANT_URL: str = "http://localhost:6333"

    # LLM - we'll use Groq as primary (free tier)
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()