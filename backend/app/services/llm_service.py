# backend/app/services/llm_service.py
from groq import Groq
from backend.app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

def generate_response(prompt: str, model: str = "openai/gpt-oss-20b") -> str:
    """Call Groq chat completion API with a valid model from the account."""
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024,
    )
    return completion.choices[0].message.content.strip()