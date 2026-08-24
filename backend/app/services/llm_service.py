# backend/app/services/llm_service.py
import google.generativeai as genai
from backend.app.config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_response(prompt: str, model: str = "gemini-1.5-flash") -> str:
    """Call Google Gemini chat completion API."""
    gemini_model = genai.GenerativeModel(model)
    response = gemini_model.generate_content(prompt)
    return response.text.strip()