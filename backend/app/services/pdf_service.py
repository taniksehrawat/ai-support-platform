# backend/app/services/pdf_service.py
import uuid
from PyPDF2 import PdfReader
from qdrant_client.models import PointStruct
from backend.app.rag.embeddings import get_document_embedding
from backend.app.database.qdrant import client, COLLECTION_NAME


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def process_pdf(file_path: str, file_id: int, user_id: int, filename: str) -> list[str]:
    """Extract text, chunk, embed, and store in Qdrant with user_id + filename metadata."""
    text = extract_text_from_pdf(file_path)
    if not text:
        return []

    chunks = chunk_text(text)
    points = []
    for i, chunk in enumerate(chunks):
        emb = get_document_embedding(chunk)
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=emb,
                payload={
                    "file_id": file_id,
                    "user_id": user_id,
                    "filename": filename,
                    "chunk_index": i,
                    "text": chunk,
                },
            )
        )

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    return [p.id for p in points]