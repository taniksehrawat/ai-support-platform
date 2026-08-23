# backend/app/api/chat.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.agents.graph import build_agent_graph
from backend.app.utils.auth import get_current_user
from backend.app.models.user import User
from backend.app.database.database import get_db
from backend.app.services.memory_service import add_message, get_history

router = APIRouter(prefix="/chat", tags=["Chat"])
agent_graph = build_agent_graph()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_msg = request.message
    history = get_history(current_user.id)

    # Prepare state with db and user_id so the tool can use them
    state = {
        "user_message": user_msg,
        "chat_history": history,
        "db": db,
        "user_id": current_user.id,
    }
    result = agent_graph.invoke(state)

    ai_response = result.get("ai_response", "Sorry, I encountered an error.")
    add_message(current_user.id, "User", user_msg)
    add_message(current_user.id, "AI", ai_response)
    return {"response": ai_response}