# backend/app/schemas/auth.py
from pydantic import BaseModel, Field
from datetime import datetime


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str