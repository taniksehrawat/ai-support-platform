# backend/app/api/admin.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from qdrant_client.models import Filter, FieldCondition, MatchValue

from backend.app.database.database import get_db
from backend.app.database.qdrant import client as qdrant, COLLECTION_NAME
from backend.app.models.knowledge_base import KnowledgeBase
from backend.app.schemas.knowledge import KnowledgeOut
from backend.app.utils.auth import get_current_admin
from backend.app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/knowledge", response_model=List[KnowledgeOut])
def list_all_knowledge(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(KnowledgeBase).order_by(KnowledgeBase.created_at.desc()).all()


@router.delete("/knowledge/{kb_id}")
def delete_knowledge(kb_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="PDF not found")

    # Remove vectors from Qdrant for this file
    try:
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="file_id", match=MatchValue(value=kb.id))]
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Qdrant delete failed: {e}")

    db.delete(kb)
    db.commit()
    return {"message": "Deleted", "id": kb_id}