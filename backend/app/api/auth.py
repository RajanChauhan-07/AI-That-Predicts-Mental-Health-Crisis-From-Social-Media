from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from urllib.parse import urlencode
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
import httpx

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

@router.get("/google")
async def google_login():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    query_string = urlencode(params)
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query_string}")

@router.get("/google/callback")
async def google_callback(code: Optional[str] = None, error: Optional[str] = None, db: Session = Depends(get_db)):
    if error:
        return RedirectResponse(f"{settings.FRONTEND_URL}?error={error}")
    if not code:
        return RedirectResponse(f"{settings.FRONTEND_URL}?error=missing_code")

    # Exchange code for token (application/x-www-form-urlencoded)
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            },
        )
        token_data = token_response.json()

        # Handle Google OAuth errors
        if "access_token" not in token_data:
            error = token_data.get("error", "unknown_error")
            return RedirectResponse(f"{settings.FRONTEND_URL}?error={error}")

        # Get user info
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        userinfo = userinfo_response.json()

    # Validate userinfo response
    if "id" not in userinfo or "email" not in userinfo:
        return RedirectResponse(f"{settings.FRONTEND_URL}?error=userinfo_failed")

    # Check if user exists
    user = db.query(User).filter(
        User.google_id == userinfo["id"]
    ).first()

    # Create user if not exists
    if not user:
        user = User(
            email=userinfo["email"],
            name=userinfo["name"],
            picture=userinfo.get("picture"),
            google_id=userinfo["id"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create JWT token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )

    # Redirect to frontend with token
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
    )

@router.get("/me")
async def get_current_user(
    token: str,
    db: Session = Depends(get_db)
):
    from app.core.security import verify_token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "spotify_connected": user.spotify_connected,
        "google_fit_connected": user.google_fit_connected,
        "notion_connected": user.notion_connected,
        "created_at": user.created_at
    }