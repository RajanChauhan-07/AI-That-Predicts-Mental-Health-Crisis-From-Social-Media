from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User
from typing import Optional

router = APIRouter()

def get_current_user(token: str, db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.get("/profile")
async def get_profile(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "connected_sources": {
            "spotify": user.spotify_connected,
            "google_fit": user.google_fit_connected,
            "notion": user.notion_connected,
        },
        "created_at": user.created_at
    }

@router.put("/profile")
async def update_profile(
    token: str,
    name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)
    if name:
        user.name = name
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully"}

@router.delete("/account")
async def delete_account(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}