# backend/app/database/qdrant.py
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PayloadSchemaType,
)
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Initialize Qdrant client
if settings.QDRANT_URL and settings.QDRANT_URL.startswith("http"):
    client = QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        timeout=30,
    )
else:
    client = QdrantClient(path="./qdrant_data")

COLLECTION_NAME = "knowledge_chunks"


def init_qdrant():
    """
    Create collection and required payload index if they don't exist.
    Never raises - logs a warning on failure so the app can still start.
    """
    try:
        collections = client.get_collections().collections
        if not any(c.name == COLLECTION_NAME for c in collections):
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=384,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection '{COLLECTION_NAME}'")
        else:
            logger.info(f"Qdrant collection '{COLLECTION_NAME}' already exists")

        # Create payload index on user_id (required for filtering).
        # Safe to call even if the index already exists - Qdrant will ignore it.
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="user_id",
            field_schema=PayloadSchemaType.INTEGER,
        )
        logger.info("Ensured payload index on 'user_id'")
    except Exception as e:
        logger.warning(f"Qdrant initialization failed (app will still start): {e}")