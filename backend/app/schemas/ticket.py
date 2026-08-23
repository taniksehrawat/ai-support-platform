# backend/app/schemas/ticket.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TicketCreate(BaseModel):
    title: str
    description: str

class TicketOut(BaseModel):
    id: int
    title: str
    description: str
    status: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True