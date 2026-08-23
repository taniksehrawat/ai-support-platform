# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database.database import engine, Base
from backend.app.database.qdrant import init_qdrant

# Import models
from backend.app.models import user, knowledge_base

# Import routers
from backend.app.api import auth, knowledge, chat, tickets

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
)

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
app.include_router(tickets.router) 

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AI Support Platform is running"}

@app.get("/")
def root():
    return {"message": "Welcome to AI Support Platform API"}

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    init_qdrant()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)