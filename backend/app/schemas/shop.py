# backend/app/schemas/shop.py
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime


class ShopOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    is_open: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ShopUpdate(BaseModel):
    description: str | None = None
    is_open: bool | None = None


class MenuItemOut(BaseModel):
    id: int
    shop_id: int
    name: str
    description: str | None = None
    price: Decimal
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    price: Decimal = Field(gt=0)
    is_available: bool = True


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    is_available: bool | None = None