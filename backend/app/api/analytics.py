# backend/app/api/analytics.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from backend.app.database.database import get_db
from backend.app.models.chat_log import ChatLog
from backend.app.models.knowledge_base import KnowledgeBase
from backend.app.utils.auth import get_current_admin

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    total = db.query(ChatLog).count()
    answered = db.query(ChatLog).filter(ChatLog.answered == True).count()
    return {
        "total_questions": total,
        "answered_questions": answered,
        "unanswered_questions": total - answered,
        "answer_rate": round((answered / total) * 100, 1) if total else 0,
        "total_pdfs": db.query(KnowledgeBase).count(),
        "unique_students": db.query(func.count(func.distinct(ChatLog.user_id))).scalar(),
    }


@router.get("/daily")
def daily(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = (
        db.query(cast(ChatLog.created_at, Date).label("day"), func.count().label("count"))
        .group_by("day").order_by("day").all()
    )
    return [{"date": str(r.day), "count": r.count} for r in rows]


@router.get("/top-questions")
def top_questions(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = (
        db.query(ChatLog.question, func.count().label("count"))
        .group_by(ChatLog.question)
        .order_by(func.count().desc())
        .limit(10).all()
    )
    return [{"question": r.question, "count": r.count} for r in rows]


@router.get("/unanswered")
def unanswered(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = (
        db.query(ChatLog.question, ChatLog.created_at)
        .filter(ChatLog.answered == False)
        .order_by(ChatLog.created_at.desc())
        .limit(20).all()
    )
    return [{"question": r.question, "asked_at": r.created_at} for r in rows]