# backend/app/services/pdf_service.py
import os
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from backend.app.database.qdrant import client, COLLECTION_NAME
from qdrant_client.models import PointStruct
import uuid

# Load embedding model (will download on first run)
model = SentenceTransformer("all-MiniLM-L6-v2")

def extract_text_from_pdf(file_path: str) -> str:
    """Read all text from a PDF file."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Simple character-based chunking."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks

def process_pdf(file_path: str, file_id: int) -> list[str]:
    """
    Extract text, chunk it, generate embeddings, and upload to Qdrant.
    Returns the list of generated chunk IDs.
    """
    text = extract_text_from_pdf(file_path)
    if not text:
        return []

    chunks = chunk_text(text)
    # Generate embeddings (batch)
    embeddings = model.encode(chunks, show_progress_bar=False)

    points = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=point_id,
                vector=emb.tolist(),
                payload={
                    "file_id": file_id,
                    "chunk_index": i,
                    "text": chunk,
                },
            )
        )

    # Upsert points into Qdrant
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
    )
    return [p.id for p in points]