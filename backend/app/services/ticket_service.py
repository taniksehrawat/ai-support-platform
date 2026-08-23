# backend/app/services/ticket_service.py
from sqlalchemy.orm import Session
from backend.app.models.ticket import SupportTicket, TicketStatus

def create_support_ticket(db: Session, user_id: int, title: str, description: str) -> SupportTicket:
    """Core logic to create a ticket. Used by both API and AI tool."""
    ticket = SupportTicket(
        title=title,
        description=description,
        user_id=user_id,
        status=TicketStatus.OPEN,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket