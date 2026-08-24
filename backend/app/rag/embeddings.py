# backend/app/rag/embeddings.py
from fastembed import TextEmbedding
from typing import List

# Load a small, efficient embedding model (384 dimensions)
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

def get_query_embedding(text: str) -> List[float]:
    embeddings = list(embedding_model.embed([text]))
    return embeddings[0].tolist()

def get_document_embedding(text: str) -> List[float]:
    return get_query_embedding(text)   # same model, same method