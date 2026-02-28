from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.services.chatbot import MindWatchChatbot

router = APIRouter()
chatbot = MindWatchChatbot()

class ChatRequest(BaseModel):
    message: str
    history: list = []
    spotify_data: Optional[dict] = None
    youtube_data: Optional[dict] = None

def get_current_user(token: str, db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/message")
async def send_message(
    token: str,
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    get_current_user(token, db)

    response = await chatbot.chat(
        message=request.message,
        history=request.history,
        spotify_data=request.spotify_data,
        youtube_data=request.youtube_data
    )

    return {"response": response}

@router.get("/starters")
async def get_conversation_starters(token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    return {
        "starters": [
            "How is my mental wellness looking today?",
            "What does my music taste say about my mood?",
            "Am I consuming too much negative content?",
            "Give me a wellness summary based on my data",
            "What should I do to improve my mental health?",
            "Why am I listening to so much music late at night?",
            "Is my content diet healthy?",
        ]
    }