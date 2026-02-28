import httpx
import base64
from datetime import datetime
from app.core.config import settings

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL = "https://api.spotify.com/v1"

SPOTIFY_SCOPES = [
    "user-read-recently-played",
    "user-top-read",
    "user-read-playback-state",
    "user-library-read",
    "playlist-read-private",
]

class SpotifyConnector:
    def __init__(self, access_token: str = None):
        self.access_token = access_token

    def get_auth_url(self, user_id: str) -> str:
        params = {
            "client_id": settings.SPOTIFY_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            "scope": " ".join(SPOTIFY_SCOPES),
            "state": user_id,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{SPOTIFY_AUTH_URL}?{query}"

    async def exchange_code(self, code: str) -> dict:
        credentials = base64.b64encode(
            f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                SPOTIFY_TOKEN_URL,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
                }
            )
            return response.json()

    async def get_recently_played(self, limit: int = 50) -> list:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SPOTIFY_API_URL}/me/player/recently-played",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"limit": limit}
            )
            data = response.json()
            return data.get("items", [])

    async def get_top_tracks(self, time_range: str = "short_term") -> list:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SPOTIFY_API_URL}/me/top/tracks",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"limit": 50, "time_range": time_range}
            )
            data = response.json()
            return data.get("items", [])

    async def get_audio_features(self, track_ids: list) -> list:
        if not track_ids:
            return []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SPOTIFY_API_URL}/audio-features",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"ids": ",".join(track_ids[:100])}
            )
            print(f"Audio features status: {response.status_code}")
            print(f"Audio features response: {response.text[:500]}")
            data = response.json()
            return data.get("audio_features", [])

    async def get_full_analysis(self) -> dict:
        # Get recently played
        recently_played = await self.get_recently_played(50)

        # Extract track IDs
        track_ids = [
            item["track"]["id"]
            for item in recently_played
            if item.get("track") and item["track"].get("id")
        ]

        # Try to get audio features
        avg_valence = avg_energy = avg_tempo = avg_danceability = 0
        audio_features = []
        audio_features_count = 0

        if track_ids:
            try:
                audio_features = await self.get_audio_features(track_ids[:50])
                valid = [
                    f for f in audio_features
                    if f and isinstance(f, dict) and "valence" in f
                ]
                audio_features_count = len(valid)
                if valid:
                    avg_valence = sum(f["valence"] for f in valid) / len(valid)
                    avg_energy = sum(f["energy"] for f in valid) / len(valid)
                    avg_tempo = sum(f["tempo"] for f in valid) / len(valid)
                    avg_danceability = sum(f["danceability"] for f in valid) / len(valid)
                else:
                    # Fallback estimates if audio features unavailable
                    avg_valence = 0.45
                    avg_energy = 0.55
                    avg_tempo = 120.0
                    avg_danceability = 0.50
            except Exception as e:
                print(f"Audio features error: {e}")
                avg_valence = 0.45
                avg_energy = 0.55
                avg_tempo = 120.0
                avg_danceability = 0.50

        # Analyze listening times
        listening_hours = []
        for item in recently_played:
            played_at = item.get("played_at", "")
            if played_at:
                try:
                    hour = datetime.fromisoformat(
                        played_at.replace("Z", "+00:00")
                    ).hour
                    listening_hours.append(hour)
                except Exception:
                    pass

        late_night_count = sum(1 for h in listening_hours if 0 <= h <= 4)
        late_night_ratio = (
            late_night_count / len(listening_hours) if listening_hours else 0
        )

        return {
            "total_tracks_analyzed": len(recently_played),
            "avg_valence": round(avg_valence, 3),
            "avg_energy": round(avg_energy, 3),
            "avg_tempo": round(avg_tempo, 1),
            "avg_danceability": round(avg_danceability, 3),
            "late_night_listening_ratio": round(late_night_ratio, 3),
            "emotional_tone": self._get_emotional_tone(avg_valence, avg_energy),
            "recently_played": recently_played[:10],
            "audio_features_count": audio_features_count,
            "debug_track_ids_count": len(track_ids),
        }

    def _get_emotional_tone(self, valence: float, energy: float) -> str:
        if valence > 0.6 and energy > 0.6:
            return "Happy & Energetic"
        elif valence > 0.6 and energy <= 0.6:
            return "Content & Calm"
        elif valence <= 0.4 and energy > 0.6:
            return "Angry & Agitated"
        elif valence <= 0.4 and energy <= 0.4:
            return "Sad & Low Energy"
        elif valence <= 0.4 and energy <= 0.6:
            return "Melancholic"
        else:
            return "Neutral"