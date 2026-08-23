# backend/app/agents/tools.py
from langchain_core.tools import tool
from sqlalchemy.orm import Session

@tool
def create_ticket(title: str, description: str) -> str:
    """Create a new support ticket with a title and description. Returns ticket ID."""
    # This function will be called from the graph; we need to pass db and user_id via runtime context.
    # We'll use a simple workaround: store them in a global during invocation.
    # (A cleaner approach would use a ToolExecutor with a state, but we keep it simple for now.)
    pass  # We'll implement a wrapper later.