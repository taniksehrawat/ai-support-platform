# backend/app/services/memory_service.py
from collections import defaultdict
from typing import List

# In-memory store: user_id -> list of message strings
_memory = defaultdict(list)

def add_message(user_id: int, role: str, content: str):
    _memory[user_id].append(f"{role}: {content}")

def get_history(user_id: int, limit: int = 10) -> List[str]:
    return _memory[user_id][-limit:]

def clear_history(user_id: int):
    _memory[user_id] = []