import re

IMPORTANT_WORDS = [
    "important", "decision", "action", "deadline", "agree",
    "yes", "no", "problem", "solution", "key", "critical",
    "follow up", "next step", "we will", "haan", "nahi",
    "zaroori", "decide", "final"
]


def score_segment(text: str) -> float:
    text_lower = text.lower()
    score = 0.0

    keyword_hits = sum(1 for word in IMPORTANT_WORDS if word in text_lower)
    score += min(keyword_hits * 0.2, 0.4)

    if re.search(r'\b(why|how|what|when|where|who|kyon|kaise|kya|kab)\b',
                 text_lower):
        score += 0.25

    if re.search(r'\d+', text):
        score += 0.15

    word_count = len(text.split())
    score += min(word_count / 50.0, 0.2)

    return round(min(score, 1.0), 3)


def get_highlights(segments: list, top_n: int = 5) -> list:
    scored = []
    for seg in segments:
        s = seg.copy()
        s["score"] = score_segment(seg["text"])
        scored.append(s)

    scored.sort(key=lambda x: x["score"], reverse=True)

    top = scored[:top_n]
    top.sort(key=lambda x: x["start_ms"])

    return top