# backend/app/agents/graph.py
from typing import TypedDict, List, Optional, Dict
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
from backend.app.services.llm_service import generate_response
from backend.app.database.qdrant import client as qdrant, COLLECTION_NAME
from backend.app.rag.embeddings import get_query_embedding


class AgentState(TypedDict):
    user_message: str
    chat_history: List[str]
    intent: Optional[str]
    retrieved_context: Optional[str]
    sources: Optional[List[Dict]]
    ai_response: Optional[str]
    db: Session
    user_id: int


def intent_agent(state: AgentState) -> AgentState:
    prompt = f"""You classify student questions to a university hostel help assistant.
Categorize the message into exactly one of:
- "knowledge_base": question about hostel rules, timings, fees, leave policy, mess, warden, etc.
- "general": greeting, thanks, small talk, or off-topic.

User message: {state['user_message']}

Return ONLY the category string."""
    intent = generate_response(prompt).strip().lower()
    if intent not in ["knowledge_base", "general"]:
        intent = "general"
    return {"intent": intent}


def retriever_agent(state: AgentState) -> AgentState:
    if state.get("intent") != "knowledge_base":
        return {"retrieved_context": None, "sources": []}

    query_embedding = get_query_embedding(state["user_message"])
    # No user_id filter: all students share the admin-uploaded hostel knowledge base
    hits = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        limit=5,
    )

    if not hits:
        return {"retrieved_context": "", "sources": []}

    parts, sources = [], []
    for h in hits:
        filename = h.payload.get("filename", "unknown")
        text = h.payload.get("text", "")
        parts.append(f"[Source: {filename}]\n{text}")
        sources.append({"filename": filename})

    return {"retrieved_context": "\n\n".join(parts), "sources": sources}


def response_agent(state: AgentState) -> AgentState:
    history = "\n".join(state.get("chat_history", [])[-5:])
    user_msg = state["user_message"]
    intent = state.get("intent", "general")

    if intent == "knowledge_base":
        ctx = state.get("retrieved_context") or ""
        if not ctx.strip():
            return {"ai_response": (
                "I couldn't find that in the hostel rules and guidelines. "
                "Please contact your hostel warden for confirmation."
            )}

        prompt = f"""You are the CU Hostel Help Assistant. Answer the student's question
using ONLY the context below. If the context does not cover the question, respond:
"I couldn't find that in the hostel rules — please contact your hostel warden."

Always cite the source filename at the end like: (Source: Hostel_Rules_2025.pdf)

Recent conversation:
{history}

Context:
{ctx}

Student: {user_msg}
Assistant:"""
        return {"ai_response": generate_response(prompt)}

    prompt = f"""You are the CU Hostel Help Assistant. Reply briefly and helpfully.

Recent conversation:
{history}

Student: {user_msg}
Assistant:"""
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