from bs4 import BeautifulSoup
from datetime import datetime
from collections import Counter
import re

# Emotional categories for video classification
CATEGORY_KEYWORDS = {
    "dark_content": [
        "suicide", "self harm", "depression", "anxiety", "hopeless",
        "death", "kill", "murder", "horror", "scary", "disturbing",
        "abuse", "trauma", "breakdown", "crisis", "suffer"
    ],
    "motivational": [
        "motivation", "success", "hustle", "grind", "inspire",
        "achieve", "goal", "growth", "mindset", "productivity",
        "entrepreneur", "discipline", "focus", "winner"
    ],
    "entertainment": [
        "funny", "comedy", "meme", "prank", "reaction", "vlog",
        "challenge", "shorts", "trending", "viral", "roast"
    ],
    "educational": [
        "tutorial", "learn", "course", "explain", "how to",
        "study", "lecture", "science", "math", "history",
        "coding", "programming", "technology", "ai", "ml"
    ],
    "music": [
        "song", "music", "lyrics", "album", "artist", "concert",
        "playlist", "beats", "remix", "cover", "acoustic"
    ],
    "romantic_sad": [
        "breakup", "heartbreak", "sad song", "missing", "lonely",
        "love story", "emotional", "crying", "tears", "hurt",
        "relationship", "ex", "goodbye"
    ],
    "gaming": [
        "gameplay", "gaming", "playthrough", "walkthrough", "esports",
        "minecraft", "fortnite", "pubg", "valorant", "gta"
    ],
    "news": [
        "news", "politics", "government", "election", "war",
        "economy", "breaking", "update", "world", "crisis"
    ],
    "spiritual": [
        "meditation", "yoga", "spiritual", "mindfulness", "peace",
        "calm", "healing", "chakra", "manifest", "gratitude"
    ],
    "fitness": [
        "workout", "fitness", "gym", "exercise", "diet",
        "weight loss", "muscle", "training", "health", "nutrition"
    ]
}

# Emotional weight of each category (-1 to +1)
CATEGORY_SENTIMENT = {
    "dark_content": -0.9,
    "romantic_sad": -0.6,
    "news": -0.3,
    "gaming": 0.0,
    "entertainment": 0.4,
    "music": 0.2,
    "educational": 0.3,
    "motivational": 0.8,
    "spiritual": 0.6,
    "fitness": 0.5,
    "uncategorized": 0.0
}


class YouTubeAnalyzer:

    def parse_watch_history(self, html_content: str) -> list:
        soup = BeautifulSoup(html_content, "lxml")
        videos = []

        # Google Takeout HTML structure
        content_cells = soup.find_all("div", class_="content-cell")

        for cell in content_cells:
            try:
                # Get video title and URL
                link = cell.find("a")
                if not link:
                    continue

                title = link.get_text(strip=True)
                url = link.get("href", "")

                # Get timestamp
                text = cell.get_text(separator="\n")
                lines = [l.strip() for l in text.split("\n") if l.strip()]

                timestamp = None
                for line in lines:
                    if any(month in line for month in [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ]):
                        timestamp = line
                        break

                if title and "youtube.com/watch" in url:
                    videos.append({
                        "title": title,
                        "url": url,
                        "timestamp": timestamp,
                        "category": self._classify_video(title),
                    })
            except Exception:
                continue

        return videos

    def parse_search_history(self, html_content: str) -> list:
        soup = BeautifulSoup(html_content, "lxml")
        searches = []

        content_cells = soup.find_all("div", class_="content-cell")

        for cell in content_cells:
            try:
                link = cell.find("a")
                if not link:
                    continue

                query = link.get_text(strip=True)
                if query:
                    searches.append({
                        "query": query,
                        "category": self._classify_video(query),
                    })
            except Exception:
                continue

        return searches

    def _classify_video(self, title: str) -> str:
        title_lower = title.lower()
        scores = {}

        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in title_lower)
            if score > 0:
                scores[category] = score

        if not scores:
            return "uncategorized"

        return max(scores, key=scores.get)

    def analyze(self, videos: list, searches: list) -> dict:
        if not videos and not searches:
            return {"error": "No data to analyze"}

        total_videos = len(videos)

        # Category breakdown
        categories = [v["category"] for v in videos]
        category_counts = Counter(categories)
        category_percentages = {
            cat: round((count / total_videos) * 100, 1)
            for cat, count in category_counts.most_common()
        } if total_videos > 0 else {}

        # Calculate emotional diet score
        sentiment_scores = []
        for video in videos:
            cat = video["category"]
            sentiment_scores.append(CATEGORY_SENTIMENT.get(cat, 0))

        avg_sentiment = (
            sum(sentiment_scores) / len(sentiment_scores)
            if sentiment_scores else 0
        )

        # Normalize to 0-100
        emotional_diet_score = round((avg_sentiment + 1) / 2 * 100, 1)

        # Dark content detection
        dark_count = category_counts.get("dark_content", 0)
        dark_percentage = round((dark_count / total_videos) * 100, 1) if total_videos > 0 else 0

        # Motivational content
        motivational_count = category_counts.get("motivational", 0)
        motivational_percentage = round(
            (motivational_count / total_videos) * 100, 1
        ) if total_videos > 0 else 0

        # Top searches
        top_searches = [s["query"] for s in searches[:20]]

        # Search category breakdown
        search_categories = [s["category"] for s in searches]
        search_category_counts = Counter(search_categories)

        # Determine overall content mood
        if dark_percentage > 20:
            content_mood = "Concerning — High dark content consumption"
        elif emotional_diet_score > 65:
            content_mood = "Positive — Mostly uplifting content"
        elif emotional_diet_score > 45:
            content_mood = "Neutral — Balanced content diet"
        else:
            content_mood = "Heavy — Emotionally draining content patterns"

        # Recovery vs rumination
        recovery_score = (
            motivational_percentage +
            category_percentages.get("spiritual", 0) +
            category_percentages.get("fitness", 0)
        )
        rumination_score = (
            dark_percentage +
            category_percentages.get("romantic_sad", 0)
        )

        return {
            "total_videos_analyzed": total_videos,
            "total_searches_analyzed": len(searches),
            "emotional_diet_score": emotional_diet_score,
            "content_mood": content_mood,
            "avg_sentiment": round(avg_sentiment, 3),
            "category_breakdown": category_percentages,
            "dark_content_percentage": dark_percentage,
            "motivational_percentage": motivational_percentage,
            "recovery_score": round(recovery_score, 1),
            "rumination_score": round(rumination_score, 1),
            "top_searches": top_searches,
            "search_categories": dict(search_category_counts.most_common(5)),
            "top_categories": list(category_counts.most_common(5)),
            "insights": self._generate_insights(
                dark_percentage,
                emotional_diet_score,
                category_percentages,
                recovery_score,
                rumination_score
            )
        }

    def _generate_insights(
        self,
        dark_pct: float,
        diet_score: float,
        categories: dict,
        recovery: float,
        rumination: float
    ) -> list:
        insights = []

        if dark_pct > 20:
            insights.append({
                "type": "warning",
                "message": f"⚠️ {dark_pct}% of your content is dark or disturbing. This can significantly impact mood."
            })

        if categories.get("romantic_sad", 0) > 15:
            insights.append({
                "type": "warning",
                "message": "💔 High consumption of sad/romantic content detected. May indicate emotional rumination."
            })

        if categories.get("motivational", 0) > 20:
            insights.append({
                "type": "positive",
                "message": "💪 Great! You consume a lot of motivational content. This supports positive mental state."
            })

        if categories.get("educational", 0) > 25:
            insights.append({
                "type": "positive",
                "message": "📚 Strong educational content consumption. Intellectual engagement supports mental wellness."
            })

        if recovery > rumination:
            insights.append({
                "type": "positive",
                "message": f"✅ Recovery content ({recovery:.0f}%) outweighs rumination content ({rumination:.0f}%). Healthy pattern!"
            })
        else:
            insights.append({
                "type": "warning",
                "message": f"⚠️ Rumination content ({rumination:.0f}%) outweighs recovery content ({recovery:.0f}%). Consider more uplifting content."
            })

        if diet_score > 65:
            insights.append({
                "type": "positive",
                "message": f"🌟 Emotional diet score: {diet_score}/100 — Your content choices support positive mental health."
            })
        elif diet_score < 35:
            insights.append({
                "type": "warning",
                "message": f"📉 Emotional diet score: {diet_score}/100 — Your content is emotionally heavy. Consider diversifying."
            })

        return insights