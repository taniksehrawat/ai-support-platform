# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database.database import engine, Base
from backend.app.database.qdrant import init_qdrant

from backend.app.models import user, knowledge_base, chat_log     # noqa
from backend.app.api import auth, knowledge, chat, admin, analytics

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

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


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "CU Hostel Help Assistant is running"}


@app.get("/")
def root():
    return {"message": "Welcome to CU Hostel Help Assistant API"}


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    init_qdrant()