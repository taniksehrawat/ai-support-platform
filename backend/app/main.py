# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database.database import engine, Base, SessionLocal
from backend.app.database.qdrant import init_qdrant

from backend.app.models import (   # noqa
    user, knowledge_base, chat_log, shop, menu_item, order,
)
from backend.app.api import auth, knowledge, chat, admin, analytics, shops, orders


def _auto_seed():
    """
    Seed admin + shops on startup IF the database is empty.
    Idempotent — safe to run on every deploy / restart.
    Critical for ephemeral environments (Render, Railway, Fly.io).
    """
    from backend.app.models.user import User
    from backend.app.models.shop import Shop

    db = SessionLocal()
    try:
        has_admin = db.query(User).filter(User.role == "admin").first() is not None
        shop_count = db.query(Shop).count()
    finally:
        db.close()

    if has_admin and shop_count > 0:
        print(f"[startup] DB ready — {shop_count} shops, admin present")
        return

    print(f"[startup] Empty DB (admin={has_admin}, shops={shop_count}) — auto-seeding...")
    try:
        from backend import seed_admin, seed_shops
        seed_admin.main()
        seed_shops.main()
        print("[startup] Auto-seed complete.")
    except Exception as e:
        print(f"[startup] Auto-seed failed: {type(e).__name__}: {e}")
        # Don't crash the app — let it start with an empty DB
        # (the operator can still upload PDFs / run seeds manually)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    init_qdrant()
    _auto_seed()
    yield


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(knowledge.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(shops.router)
app.include_router(orders.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "CU Hostel Help Assistant is running"}


@app.get("/")
def root():
    return {"message": "Welcome to CU Hostel Help Assistant API"}