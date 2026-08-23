# backend/app/database/qdrant.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from backend.app.config import settings

# If a QDRANT_URL is provided (e.g., in Docker), connect to server;
# otherwise use local file storage for development.
if settings.QDRANT_URL and settings.QDRANT_URL.startswith("http"):
    client = QdrantClient(url=settings.QDRANT_URL)
else:
    client = QdrantClient(path="./qdrant_data")

COLLECTION_NAME = "knowledge_chunks"

def init_qdrant():
    """Create collection if it doesn't exist."""
    collections = client.get_collections().collections
    if not any(c.name == COLLECTION_NAME for c in collections):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=768,
                distance=Distance.COSINE,
            ),
        )