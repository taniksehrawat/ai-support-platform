# backend/app/schemas/order.py
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    item_name: str
    quantity: int
    unit_price: Decimal

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    student_id: int
    shop_id: int
    status: str
    total_amount: Decimal
    note: str | None = None
    created_at: datetime
    items: list[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str