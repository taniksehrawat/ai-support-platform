# backend/app/agents/graph.py
import re
import json
from typing import TypedDict, List, Optional, Dict

from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.services.llm_service import generate_response
from backend.app.database.qdrant import client as qdrant, COLLECTION_NAME
from backend.app.rag.embeddings import get_query_embedding
from backend.app.models.menu_item import MenuItem
from backend.app.models.shop import Shop
from backend.app.models.order import Order, OrderItem


ALLOWED_INTENTS = {"knowledge_base", "menu_search", "place_order", "general"}


class AgentState(TypedDict):
    user_message: str
    chat_history: List[str]
    intent: Optional[str]
    extracted: Optional[Dict]
    retrieved_context: Optional[str]
    sources: Optional[List[Dict]]
    menu_results: Optional[List[Dict]]
    order_id: Optional[int]
    order_summary: Optional[str]
    ai_response: Optional[str]
    db: Session
    user_id: int


# ---------- 1. Intent + entity extraction ----------
def intent_agent(state: AgentState) -> AgentState:
    history = "\n".join(state.get("chat_history", [])[-6:])

    prompt = f"""You classify student messages for a hostel assistant that answers rules
AND takes food orders from campus shops.

Return ONLY valid JSON. No explanation, no markdown fences.

Possible intents:
- "knowledge_base": questions about hostel rules, timings, fees, leave, warden, mess policy.
- "menu_search": student mentions a dish but NO shop. (e.g. "I want a sandwich", "show me sandwiches")
- "place_order": student names BOTH a dish AND a shop. (e.g. "order 2 sandwiches from Sharma Cafe")
- "general": greetings, thanks, small talk, off-topic.

IMPORTANT: If a dish is mentioned but no shop name, ALWAYS classify as menu_search, never place_order.

Also extract entities (null if not present):
- dish: lowercase food name (e.g. "sandwich", "coffee")
- shop_name: exact shop name if mentioned
- quantity: integer if explicitly stated

Recent conversation (use it to resolve "it", "that", "same", omitted context):
{history}

Student message: {state['user_message']}

Return JSON exactly like:
{{"intent": "...", "dish": null, "shop_name": null, "quantity": null}}"""

    raw = generate_response(prompt).strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = {}

    intent = parsed.get("intent", "general")
    if intent not in ALLOWED_INTENTS:
        intent = "general"

    return {
        "intent": intent,
        "extracted": {
            "dish": (parsed.get("dish") or "").lower() or None,
            "shop_name": parsed.get("shop_name") or None,
            "quantity": parsed.get("quantity") or None,
        },
    }


def route_intent(state: AgentState) -> str:
    return state.get("intent") or "general"


# ---------- 2a. RAG retriever (existing behavior) ----------
def retriever_agent(state: AgentState) -> AgentState:
    if state.get("intent") != "knowledge_base":
        return {"retrieved_context": None, "sources": []}

    query_embedding = get_query_embedding(state["user_message"])
    hits = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=5,
    ).points

    if not hits:
        return {"retrieved_context": "", "sources": []}

    parts, sources = [], []
    for h in hits:
        filename = h.payload.get("filename", "unknown")
        text = h.payload.get("text", "")
        parts.append(f"[Source: {filename}]\n{text}")
        sources.append({"filename": filename})
    return {"retrieved_context": "\n\n".join(parts), "sources": sources}


# ---------- 2b. Menu search ----------
def menu_search_agent(state: AgentState) -> AgentState:
    dish = (state.get("extracted") or {}).get("dish")
    if not dish:
        return {"menu_results": []}

    rows = (
        state["db"].query(MenuItem, Shop)
        .join(Shop, MenuItem.shop_id == Shop.id)
        .filter(Shop.is_open.is_(True))
        .filter(MenuItem.is_available.is_(True))
        .filter(or_(
            MenuItem.name.ilike(f"%{dish}%"),
            MenuItem.description.ilike(f"%{dish}%"),
        ))
        .limit(10)
        .all()
    )

    results = [
        {
            "shop_id": shop.id,
            "shop_name": shop.name,
            "item_id": item.id,
            "item_name": item.name,
            "price": float(item.price),
        }
        for item, shop in rows
    ]
    return {"menu_results": results}
def _clean_name(name: str) -> str:
    """Strip quotes, trailing punctuation, and extra whitespace from LLM-extracted names."""
    if not name:
        return ""
    name = name.strip().strip("'\"`.")
    name = re.sub(r"[^\w\s]", "", name)   # keep only alphanumeric + spaces
    name = re.sub(r"\s+", " ", name).strip()
    return name

# ---------- 2c. Place order ----------
def order_agent(state: AgentState) -> AgentState:
    db = state["db"]
    student_id = state["user_id"]
    extracted = state.get("extracted") or {}
    dish = extracted.get("dish")
    shop_name = extracted.get("shop_name")

    try:
        quantity = max(1, int(extracted.get("quantity") or 1))
    except (TypeError, ValueError):
        quantity = 1

    # Fallback: if no shop mentioned but the previous turn listed exactly one shop, use it.
    menu_results = state.get("menu_results") or []
    if not shop_name and menu_results:
        unique_shops = {r["shop_name"] for r in menu_results}
        if len(unique_shops) == 1:
            shop_name = next(iter(unique_shops))

    if not dish or not shop_name:
        return {"order_summary": "missing_info"}

    shop_name = _clean_name(shop_name)
    shop = db.query(Shop).filter(Shop.name.ilike(f"%{shop_name}%")).first()
    if not shop or not shop.is_open:
        return {"order_summary": "shop_unavailable"}

    item = (
        db.query(MenuItem)
        .filter(MenuItem.shop_id == shop.id)
        .filter(MenuItem.is_available.is_(True))
        .filter(or_(
            MenuItem.name.ilike(f"%{dish}%"),
            MenuItem.description.ilike(f"%{dish}%"),
        ))
        .first()
    )
    if not item:
        return {"order_summary": "item_unavailable"}

    # Price is read from DB — never trust a client-supplied price
    total = item.price * quantity

    order = Order(
        student_id=student_id,
        shop_id=shop.id,
        status="pending",
        total_amount=total,
    )
    db.add(order)
    db.flush()  # get order.id before commit

    db.add(OrderItem(
        order_id=order.id,
        menu_item_id=item.id,
        item_name=item.name,
        quantity=quantity,
        unit_price=item.price,
    ))
    db.commit()

    return {
        "order_id": order.id,
        "order_summary": f"{quantity} x {item.name} from {shop.name} (Order #{order.id}, ₹{total:.2f})",
    }


# ---------- 3. Response formatter ----------
def response_agent(state: AgentState) -> AgentState:
    intent = state.get("intent")
    history = "\n".join(state.get("chat_history", [])[-5:])

    if intent == "menu_search":
        results = state.get("menu_results") or []
        if not results:
            return {"ai_response": (
                "Sorry, no shop currently offers that. Try asking for tea, coffee, "
                "sandwich, or snacks."
            )}
        lines = [f"- {r['item_name']} at {r['shop_name']} — ₹{r['price']:.2f}" for r in results]
        return {"ai_response": (
            "Here's what I found:\n" + "\n".join(lines) +
            "\n\nSay 'order <item> from <shop>' to place an order."
        )}

    if intent == "place_order":
        s = state.get("order_summary")
        if s == "missing_info":
            return {"ai_response": "I need both a dish and a shop. Try: 'order 2 sandwiches from Sharma Cafe'."}
        if s == "shop_unavailable":
            return {"ai_response": "That shop is closed or doesn't exist right now."}
        if s == "item_unavailable":
            return {"ai_response": "That item isn't available at that shop right now."}
        return {"ai_response": f"✅ Order placed! {s}. The shop will confirm shortly."}

    if intent == "knowledge_base":
        ctx = (state.get("retrieved_context") or "").strip()
        if not ctx:
            return {"ai_response": (
                "I couldn't find that in the hostel rules. "
                "Please contact your hostel warden."
            )}
        prompt = f"""You are the CU Hostel Help Assistant. Answer using ONLY the context below.
If it doesn't cover the question, respond: "I couldn't find that in the hostel rules — please contact your hostel warden."
Always cite the source filename at the end like (Source: Hostel_Rules_2025.pdf).

Recent conversation:
{history}

Context:
{ctx}

Student: {state['user_message']}
Assistant:"""
        return {"ai_response": generate_response(prompt)}

    prompt = f"""You are the CU Hostel Help Assistant. Reply briefly and helpfully.
You can also help with food orders — if the student wants food, suggest:
"what sandwiches are available?" or "order X from <shop>".

Recent conversation:
{history}

Student: {state['user_message']}
Assistant:"""
    return {"ai_response": generate_response(prompt)}


# ---------- 4. Graph wiring ----------
def build_agent_graph():
    g = StateGraph(AgentState)
    g.add_node("intent_agent", intent_agent)
    g.add_node("retriever_agent", retriever_agent)
    g.add_node("menu_search_agent", menu_search_agent)
    g.add_node("order_agent", order_agent)
    g.add_node("response_agent", response_agent)

    g.set_entry_point("intent_agent")
    g.add_conditional_edges("intent_agent", route_intent, {
        "knowledge_base": "retriever_agent",
        "menu_search": "menu_search_agent",
        "place_order": "order_agent",
        "general": "response_agent",
    })
    g.add_edge("retriever_agent", "response_agent")
    g.add_edge("menu_search_agent", "response_agent")
    g.add_edge("order_agent", "response_agent")
    g.add_edge("response_agent", END)
    return g.compile()