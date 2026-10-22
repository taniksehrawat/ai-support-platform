# backend/app/models/chat_log.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.app.database.database import Base

class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    intent = Column(String, default="general")
    answered = Column(Boolean, default=False)
    source_files = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())