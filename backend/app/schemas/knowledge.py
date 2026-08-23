# backend/app/schemas/knowledge.py
from pydantic import BaseModel
from datetime import datetime

class KnowledgeOut(BaseModel):
    id: int
    filename: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True