from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.connectors.spotify import SpotifyConnector
from app.connectors.youtube import YouTubeAnalyzer

router = APIRouter()

def get_current_user(token: str, db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ─── SPOTIFY ────────────────────────────────────────────

@router.get("/spotify/connect")
async def spotify_connect(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    connector = SpotifyConnector()
    auth_url = connector.get_auth_url(str(user.id))
    return RedirectResponse(auth_url)

@router.get("/spotify/callback")
async def spotify_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == str(state)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    connector = SpotifyConnector()
    token_data = await connector.exchange_code(code)

    if "access_token" not in token_data:
        raise HTTPException(status_code=400, detail="Failed to get Spotify token")

    import json
    user.spotify_token = json.dumps(token_data)
    user.spotify_connected = True
    db.commit()

    from app.core.config import settings
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/dashboard?spotify=connected"
    )

@router.get("/spotify/analysis")
async def spotify_analysis(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    if not user.spotify_connected or not user.spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    import json
    token_data = json.loads(user.spotify_token)
    connector = SpotifyConnector(access_token=token_data["access_token"])
    analysis = await connector.get_full_analysis()
    return analysis

@router.get("/spotify/status")
async def spotify_status(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return {
        "connected": user.spotify_connected,
        "user_id": user.id
    }

@router.get("/spotify/debug")
async def spotify_debug(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    if not user.spotify_connected or not user.spotify_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    import json
    token_data = json.loads(user.spotify_token)
    connector = SpotifyConnector(access_token=token_data["access_token"])

    recent = await connector.get_recently_played(3)
    track_ids = [
        item["track"]["id"]
        for item in recent
        if item.get("track") and item["track"].get("id")
    ]
    features = await connector.get_audio_features(track_ids[:3])

    return {
        "sample_tracks": [item["track"]["name"] for item in recent[:3]],
        "track_ids": track_ids[:3],
        "raw_features": features[:3],
        "spotify_token_type": token_data.get("token_type"),
        "has_refresh_token": "refresh_token" in token_data,
    }

# ─── YOUTUBE ────────────────────────────────────────────

@router.post("/youtube/analyze")
async def youtube_analyze(
    token: str,
    watch_history: UploadFile = File(...),
    search_history: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    get_current_user(token, db)

    # Read watch history
    watch_content = await watch_history.read()
    watch_html = watch_content.decode("utf-8", errors="ignore")

    # Read search history if provided
    search_html = ""
    if search_history:
        search_content = await search_history.read()
        search_html = search_content.decode("utf-8", errors="ignore")

    # Parse and analyze
    analyzer = YouTubeAnalyzer()
    videos = analyzer.parse_watch_history(watch_html)
    searches = analyzer.parse_search_history(search_html) if search_html else []
    analysis = analyzer.analyze(videos, searches)

    return analysis

@router.get("/youtube/sample")
async def youtube_sample(token: str, db: Session = Depends(get_db)):
    get_current_user(token, db)
    return {
        "message": "Upload your watch-history.html from Google Takeout to analyze",
        "instructions": [
            "Go to https://takeout.google.com",
            "Select only YouTube and YouTube Music",
            "Select only History",
            "Download and extract the zip",
            "Upload watch-history.html here"
        ]
    }

# ─── ALL CONNECTORS STATUS ──────────────────────────────

@router.get("/status")
async def all_connectors_status(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return {
        "spotify": user.spotify_connected,
        "google_fit": user.google_fit_connected,
        "notion": user.notion_connected,
    }