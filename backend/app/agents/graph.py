# backend/app/agents/graph.py
import json
import re
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

ALLOWED_INTENTS = {"knowledge_base", "menu_search", "shop_listing", "place_order", "general"}


class AgentState(TypedDict):
    user_message: str
    chat_history: List[str]
    intent: Optional[str]
    extracted: Optional[Dict]
    retrieved_context: Optional[str]
    sources: Optional[List[Dict]]
    menu_results: Optional[List[Dict]]
    shop_results: Optional[List[Dict]]
    order_id: Optional[int]
    order_summary: Optional[str]
    order_error_context: Optional[Dict]
    ai_response: Optional[str]
    db: Session
    user_id: int


def _clean_name(name: str) -> str:
    """Sanitize an LLM-extracted name: strip quotes/punctuation and normalize separators."""
    if not name:
        return ""
    name = name.strip().strip("'\"`.")
    name = name.replace("_", " ").replace("-", " ")
    name = re.sub(r"[^\w\s]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _find_shop(db: Session, shop_name: str):
    """Find a shop, tolerating typos and extra spaces."""
    if not shop_name:
        return None
    cleaned = _clean_name(shop_name)
    shop = db.query(Shop).filter(Shop.name.ilike(f"%{cleaned}%")).first()
    if shop:
        return shop
    # Fallback: compare without spaces
    target = cleaned.replace(" ", "").lower()
    for s in db.query(Shop).all():
        if s.name.replace(" ", "").lower() == target:
            return s
    return None


# ---------- 1. Intent + entity extraction ----------
def intent_agent(state: AgentState) -> AgentState:
    history = "\n".join(state.get("chat_history", [])[-6:])

    prompt = f"""You classify student messages for a hostel assistant that answers rules
AND handles food ordering from campus shops.

Return ONLY valid JSON. No markdown, no explanation.

Possible intents:
- "knowledge_base": hostel rules, timings, fees, leave, warden, mess policy
- "shop_listing": asks WHICH shops exist or are open ("which shops are open", "where can I order", "list shops")
- "menu_search": asks about a DISH but names NO shop ("what sandwiches", "do you have coffee")
- "place_order": names BOTH a dish AND a shop ("order 2 sandwiches from Sharma Cafe")
- "general": greetings, thanks, small talk, off-topic

Classification rules (STRICT):
1. "which shops" / "where can I order" / "list shops" / "open shops" → shop_listing
2. Dish mentioned but NO shop → menu_search
3. Dish AND shop both mentioned → place_order
4. NEVER invent shop names — only classify.

Also extract (null if absent):
- dish: lowercase food name
- shop_name: EXACT shop name as written by the user (do not correct typos)
- quantity: integer if stated

Recent conversation:
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


# ---------- 2a. RAG retriever ----------
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


# ---------- 2b. Shop listing (NEW) ----------
def shop_listing_agent(state: AgentState) -> AgentState:
    shops = state["db"].query(Shop).filter(Shop.is_open.is_(True)).order_by(Shop.name).all()
    return {
        "shop_results": [
            {"id": s.id, "name": s.name, "description": s.description or ""}
            for s in shops
        ]
    }


# ---------- 2c. Menu search ----------
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


# ---------- 2d. Order placement (upgraded errors) ----------
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

    # Fallback: reuse prior single-shop if only one appeared earlier
    menu_results = state.get("menu_results") or []
    if not shop_name and menu_results:
        unique_shops = {r["shop_name"] for r in menu_results}
        if len(unique_shops) == 1:
            shop_name = next(iter(unique_shops))

    if not dish or not shop_name:
        return {"order_summary": "missing_info"}

    shop = _find_shop(db, shop_name)
    if not shop:
        # Suggest actual open shops
        open_shops = db.query(Shop).filter(Shop.is_open.is_(True)).all()
        return {
            "order_summary": "shop_not_found",
            "order_error_context": {
                "requested_shop": shop_name,
                "available_shops": [{"name": s.name} for s in open_shops],
            },
        }
    if not shop.is_open:
        return {
            "order_summary": "shop_closed",
            "order_error_context": {"shop_name": shop.name},
        }

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
        # Suggest items that this shop does have
        items = (
            db.query(MenuItem)
            .filter(MenuItem.shop_id == shop.id, MenuItem.is_available.is_(True))
            .all()
        )
        return {
            "order_summary": "item_not_found",
            "order_error_context": {
                "shop_name": shop.name,
                "requested_dish": dish,
                "available_items": [
                    {"name": i.name, "price": float(i.price)} for i in items
                ],
            },
        }

    total = item.price * quantity

    order = Order(
        student_id=student_id,
        shop_id=shop.id,
        status="pending",
        total_amount=total,
    )
    db.add(order)
    db.flush()
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

    # --- Shop listing ---
    if intent == "shop_listing":
        shops = state.get("shop_results") or []
        if not shops:
            return {"ai_response": "No shops are open right now."}
        lines = [f"- {s['name']}" + (f" — {s['description']}" if s['description'] else "")
                 for s in shops]
        return {"ai_response": (
            "Open shops right now:\n" + "\n".join(lines) +
            "\n\nAsk 'what sandwiches are available?' or 'order X from <shop>' to continue."
        )}

    # --- Menu search ---
    if intent == "menu_search":
        results = state.get("menu_results") or []
        if not results:
            return {"ai_response": (
                "Sorry, no shop currently offers that. Try 'which shops are open?' to see options."
            )}
        lines = [f"- {r['item_name']} at {r['shop_name']} — ₹{r['price']:.2f}" for r in results]
        return {"ai_response": (
            "Here's what I found:\n" + "\n".join(lines) +
            "\n\nSay 'order <item> from <shop>' to place an order."
        )}

    # --- Place order ---
    if intent == "place_order":
        s = state.get("order_summary")
        ctx = state.get("order_error_context") or {}

        if s == "missing_info":
            return {"ai_response": (
                "I need both a dish and a shop. Try: 'order 2 sandwiches from Sharma Cafe'."
            )}
        if s == "shop_not_found":
            req = ctx.get("requested_shop", "that shop")
            shops = ctx.get("available_shops", [])
            names = ", ".join(sh["name"] for sh in shops) if shops else "none"
            return {"ai_response": (
                f"I don't have a shop called '{req}'. Open shops: {names}.\n\n"
                f"Try: 'order <item> from <shop>'."
            )}
        if s == "shop_closed":
            name = ctx.get("shop_name", "That shop")
            return {"ai_response": f"{name} is currently closed. Try 'which shops are open?'"}
        if s == "item_not_found":
            shop = ctx.get("shop_name", "that shop")
            dish = ctx.get("requested_dish", "that item")
            items = ctx.get("available_items", [])
            menu_lines = ", ".join(f"{i['name']} (₹{i['price']:.2f})" for i in items)
            return {"ai_response": (
                f"{shop} doesn't have '{dish}'.\n\nTheir menu: {menu_lines}\n\n"
                f"Try 'order <item> from {shop}'."
            )}
        return {"ai_response": f"✅ Order placed! {s}"}

    # --- Knowledge base ---
    if intent == "knowledge_base":
        ctx = (state.get("retrieved_context") or "").strip()
        if not ctx:
            return {"ai_response": (
                "I couldn't find that in the hostel rules. Please contact your hostel warden."
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

    # --- General (with anti-hallucination guard) ---
    prompt = f"""You are the CU Hostel Help Assistant. Reply briefly and helpfully.

IMPORTANT: You do NOT have access to the list of shops, menus, or prices.
NEVER invent shop names or items. If the user asks about shops or food, reply:
"Ask me 'which shops are open?' or 'what sandwiches are available?' — I can look that up."

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
    g.add_node("shop_listing_agent", shop_listing_agent)
    g.add_node("menu_search_agent", menu_search_agent)
    g.add_node("order_agent", order_agent)
    g.add_node("response_agent", response_agent)

    g.set_entry_point("intent_agent")
    g.add_conditional_edges("intent_agent", route_intent, {
        "knowledge_base": "retriever_agent",
        "shop_listing": "shop_listing_agent",
        "menu_search": "menu_search_agent",
        "place_order": "order_agent",
        "general": "response_agent",
    })
    g.add_edge("retriever_agent", "response_agent")
    g.add_edge("shop_listing_agent", "response_agent")
    g.add_edge("menu_search_agent", "response_agent")
    g.add_edge("order_agent", "response_agent")
    g.add_edge("response_agent", END)
    return g.compile()