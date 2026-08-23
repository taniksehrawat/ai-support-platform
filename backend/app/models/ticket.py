# backend/app/models/ticket.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.sql import func
import enum
from backend.app.database.database import Base

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SqlEnum(TicketStatus), default=TicketStatus.OPEN, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())