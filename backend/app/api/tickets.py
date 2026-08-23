# backend/app/api/tickets.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database.database import get_db
from backend.app.models.user import User
from backend.app.models.ticket import SupportTicket
from backend.app.schemas.ticket import TicketCreate, TicketOut
from backend.app.utils.auth import get_current_user
from backend.app.services.ticket_service import create_support_ticket

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/", response_model=TicketOut)
def create_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_support_ticket(db, current_user.id, ticket.title, ticket.description)

@router.get("/", response_model=List[TicketOut])
def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id).all()