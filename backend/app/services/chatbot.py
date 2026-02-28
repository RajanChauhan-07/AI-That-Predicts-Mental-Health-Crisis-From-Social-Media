from google import genai
from google.genai import types
from app.core.config import settings

SYSTEM_PROMPT = """You are MindWatch AI, a compassionate and insightful mental wellness assistant.

You have access to the user's real data:
- Their Spotify music analysis (mood, energy, valence scores)
- Their YouTube content consumption patterns
- Their overall wellness score

Your role is to:
1. Provide personalized mental wellness insights based on their actual data
2. Be empathetic, warm, and supportive
3. Give actionable advice based on their patterns
4. Notice concerning patterns and gently address them
5. Celebrate positive patterns
6. Never diagnose medical conditions
7. Always recommend professional help for serious concerns

Keep responses concise (2-4 paragraphs max), warm, and actionable.
Always reference their actual data when giving insights.
"""

class MindWatchChatbot:
    def __init__(self):
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        self.client = genai.Client(api_key=api_key) if api_key else None

    def build_context(
        self,
        spotify_data: dict = None,
        youtube_data: dict = None
    ) -> str:
        context_parts = ["Here is the user's current wellness data:\n"]

        if spotify_data:
            recent_tracks = ', '.join([
                item['track']['name']
                for item in spotify_data.get('recently_played', [])[:5]
                if item.get('track')
            ])
            context_parts.append(f"""
🎵 SPOTIFY MUSIC ANALYSIS:
- Emotional Tone: {spotify_data.get('emotional_tone', 'Unknown')}
- Happiness (Valence): {round(spotify_data.get('avg_valence', 0) * 100)}%
- Energy Level: {round(spotify_data.get('avg_energy', 0) * 100)}%
- Danceability: {round(spotify_data.get('avg_danceability', 0) * 100)}%
- Late Night Listening: {round(spotify_data.get('late_night_listening_ratio', 0) * 100)}%
- Tracks Analyzed: {spotify_data.get('total_tracks_analyzed', 0)}
- Recent tracks: {recent_tracks}
""")

        if youtube_data:
            top_cats = ', '.join([
                f"{cat} ({pct}%)"
                for cat, pct in list(youtube_data.get('category_breakdown', {}).items())[:4]
            ])
            context_parts.append(f"""
📺 YOUTUBE CONTENT ANALYSIS:
- Emotional Diet Score: {youtube_data.get('emotional_diet_score', 0)}/100
- Content Mood: {youtube_data.get('content_mood', 'Unknown')}
- Videos Analyzed: {youtube_data.get('total_videos_analyzed', 0)}
- Dark Content: {youtube_data.get('dark_content_percentage', 0)}%
- Motivational Content: {youtube_data.get('motivational_percentage', 0)}%
- Recovery Score: {youtube_data.get('recovery_score', 0)}%
- Rumination Score: {youtube_data.get('rumination_score', 0)}%
- Top Categories: {top_cats}
""")

        if not spotify_data and not youtube_data:
            context_parts.append(
                "No data connected yet. Encourage the user to connect Spotify or upload YouTube history."
            )

        overall = []
        if spotify_data:
            overall.append(round(spotify_data.get('avg_valence', 0) * 100))
        if youtube_data:
            overall.append(youtube_data.get('emotional_diet_score', 0))
        if overall:
            avg = sum(overall) / len(overall)
            context_parts.append(f"\n📊 OVERALL WELLNESS SCORE: {round(avg)}/100\n")

        return "\n".join(context_parts)

    async def chat(
        self,
        message: str,
        history: list,
        spotify_data: dict = None,
        youtube_data: dict = None
    ) -> str:
        if not self.client:
            return "MindWatch AI is not configured yet (missing GEMINI_API_KEY). Please add your API key in the server environment to enable the chat."
        try:
            context = self.build_context(spotify_data, youtube_data)
            full_message = f"{SYSTEM_PROMPT}\n\n{context}\n\nUser: {message}"

            # Build history (accept "user", "model", or "assistant")
            gemini_history = []
            for msg in history[-10:]:
                if not isinstance(msg, dict) or "content" not in msg:
                    continue
                role = "user" if msg.get("role") == "user" else "model"
                gemini_history.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=str(msg["content"]))]
                    )
                )

            # Add current message
            gemini_history.append(
                types.Content(
                    role="user",
                    parts=[types.Part(text=full_message)]
                )
            )

            response = self.client.models.generate_content(
                model="gemini-1.5-flash",
                contents=gemini_history,
            )

            return response.text

        except Exception as e:
            print(f"Chatbot error: {e}")
            return f"I'm having trouble connecting right now. Error: {str(e)}"