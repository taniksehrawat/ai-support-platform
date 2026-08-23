# backend/app/agents/graph.py
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
from backend.app.services.llm_service import generate_response
from backend.app.services.ticket_service import create_support_ticket
from backend.app.database.qdrant import client as qdrant, COLLECTION_NAME
from sentence_transformers import SentenceTransformer
import json

embedder = SentenceTransformer("all-MiniLM-L6-v2")

class AgentState(TypedDict):
    user_message: str
    chat_history: List[str]
    intent: Optional[str]
    retrieved_context: Optional[str]
    ai_response: Optional[str]
    # The following will be injected by the chat endpoint
    db: Session
    user_id: int

def intent_agent(state: AgentState) -> AgentState:
    prompt = f"""You are an intent classifier. Categorize the user message into one of:
- "knowledge_base": User asks a question that likely can be answered from a support PDF.
- "create_ticket": User wants to report an issue, request help, or create a support ticket.
- "general": General greeting, off-topic, or small talk.

User message: {state['user_message']}

Return ONLY the category string, nothing else."""
    intent = generate_response(prompt).strip().lower()
    if intent not in ["knowledge_base", "create_ticket", "general"]:
        intent = "general"
    return {"intent": intent}

def retriever_agent(state: AgentState) -> AgentState:
    if state.get("intent") != "knowledge_base":
        return {"retrieved_context": None}
    query_embedding = embedder.encode(state["user_message"]).tolist()
    search_result = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        limit=3,
    )
    if not search_result:
        return {"retrieved_context": "No relevant documents found."}
    parts = []
    for hit in search_result:
        text = hit.payload.get("text", "")
        parts.append(f"[Source: {hit.payload.get('file_id', 'unknown')}] {text}")
    return {"retrieved_context": "\n\n".join(parts)}

def response_agent(state: AgentState) -> AgentState:
    history = "\n".join(state.get("chat_history", [])[-5:])
    user_msg = state["user_message"]
    intent = state.get("intent", "general")

    if intent == "knowledge_base":
        ctx = state.get("retrieved_context", "No context found.")
        prompt = f"""You are a helpful support assistant. Answer using the context below. If the context doesn't answer, say so politely.

Conversation history:
{history}

Context:
{ctx}

User: {user_msg}
AI:"""
        return {"ai_response": generate_response(prompt)}

    elif intent == "create_ticket":
        # --- AI Tool Calling ---
        # 1. Ask the LLM to extract a title and description for the ticket.
        extraction_prompt = f"""Extract a short title (max 5 words) and a brief description from the user's request. Return ONLY a JSON object with keys "title" and "description". Do NOT include any other text.

User request: {user_msg}

JSON:"""
        raw = generate_response(extraction_prompt)
        try:
            # Clean up markdown if any
            json_str = raw.strip().strip("```json").strip("```").strip()
            details = json.loads(json_str)
            title = details.get("title", "Support Request")
            description = details.get("description", user_msg)
        except Exception:
            title = "Support Request"
            description = user_msg

        # 2. Actually call the tool (create ticket in DB)
        ticket = create_support_ticket(state["db"], state["user_id"], title, description)

        # 3. Generate confirmation response
        response = f"I've created a support ticket for you.\n\n**Ticket #{ticket.id}**\nTitle: {ticket.title}\nStatus: {ticket.status.value}\n\nOur team will get back to you shortly."
        return {"ai_response": response}

    else:
        prompt = f"""You are a helpful customer support assistant. Respond naturally.

Conversation history:
{history}

User: {user_msg}
AI:"""
        return {"ai_response": generate_response(prompt)}


def build_agent_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("intent_agent", intent_agent)
    workflow.add_node("retriever_agent", retriever_agent)
    workflow.add_node("response_agent", response_agent)
    workflow.set_entry_point("intent_agent")
    workflow.add_edge("intent_agent", "retriever_agent")
    workflow.add_edge("retriever_agent", "response_agent")
    workflow.add_edge("response_agent", END)
    return workflow.compile()