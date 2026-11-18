# backend/app/services/llm_service.py
import logging

from groq import (
    Groq,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
)
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from backend.app.config import settings

logger = logging.getLogger(__name__)
client = Groq(api_key=settings.GROQ_API_KEY)

_RETRYABLE = (RateLimitError, APIConnectionError, APITimeoutError)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(_RETRYABLE),
    reraise=True,
)
def generate_response(prompt: str, model: str = "openai/gpt-oss-20b") -> str:
    """Call Groq with retry on transient errors (429 / network)."""
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024,
    )
    return completion.choices[0].message.content.strip()