# backend/app/api/knowledge.py
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.models.knowledge_base import KnowledgeBase
from backend.app.schemas.knowledge import KnowledgeOut
from backend.app.utils.auth import get_current_user
from backend.app.models.user import User
from backend.app.services.pdf_service import process_pdf

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=KnowledgeOut)
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Save file to disk
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create DB record
    kb_entry = KnowledgeBase(
        filename=file.filename,
        user_id=current_user.id,
    )
    db.add(kb_entry)
    db.commit()
    db.refresh(kb_entry)

    # Process PDF (extract, embed, store in Qdrant)
    try:
        process_pdf(file_location, kb_entry.id, current_user.id, file.filename)
    except Exception as e:
        # Rollback DB entry on failure
        db.delete(kb_entry)
        db.commit()
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")

    return kb_entry