from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base

# Import all models so relationships are properly set up
from app.models.user import User
from app.models.analysis import Analysis, ChatMessage, RawData

from app.api import auth, users, connectors, analysis
from app.api import chat

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MindWatch API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(connectors.router, prefix="/api/connectors", tags=["Connectors"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chatbot"])

@app.get("/")
def root():
    return {"app": "MindWatch", "version": "1.0.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}