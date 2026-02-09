"""
AI Sentiment & Urgency Analyzer for Public Pulse
Multi-dimensional analysis of citizen reports including:
- Urgency detection (how time-critical is the report)
- Emotion classification (frustration, fear, neutral, positive)  
- Severity estimation based on language intensity
- Multilingual support (English, Hindi, Gujarati)
"""

import re
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger("sentiment-analyzer")

# Urgency keywords by language
URGENCY_KEYWORDS = {
    "critical": {
        "en": ["emergency", "urgent", "immediately", "danger", "life-threatening", "critical", "fatal",
               "collapse", "drowning", "fire", "explosion", "accident", "bleeding", "dying"],
        "hi": ["emergency", "turant", "jaldi", "khatarnak", "jaan", "aag", "hadsa", "madat"],
        "gu": ["tatkalik", "jaldi", "jokhami", "aag", "akasmat", "madad"],
    },
    "high": {
        "en": ["flooding", "blocked", "stuck", "stranded", "overflow", "sewage", "hazard",
               "unsafe", "broken", "fallen", "collapsed", "power cut", "blackout", "major"],
        "hi": ["baarish", "paani", "band", "tuta", "kharab", "bijli", "bada", "bahut"],
        "gu": ["varsad", "paani", "band", "tutelu", "kharab", "vij", "motu"],
    },
    "moderate": {
        "en": ["pothole", "garbage", "smell", "dirty", "noisy", "crack", "leak", "slow",
               "damaged", "poor", "bad", "complaint", "issue", "problem", "concern"],
        "hi": ["gaddha", "kachra", "ganda", "shor", "tuta", "samasya", "shikayat"],
        "gu": ["khado", "kachro", "gandu", "awaaj", "tutelu", "samasya", "farid"],
    }
}

# Emotion indicators
EMOTION_KEYWORDS = {
    "frustration": ["again", "still", "always", "never", "fed up", "tired", "nothing done",
                    "no action", "ignored", "useless", "waste", "why", "how long", "phir se",
                    "kab tak", "koi nahi sunta", "faaltu"],
    "fear": ["scared", "afraid", "dangerous", "risky", "unsafe", "children", "dark",
             "accident", "injury", "darr", "khatarnak", "bacche", "andhera"],
    "anger": ["terrible", "worst", "pathetic", "disgusting", "shame", "corruption",
              "incompetent", "bakwas", "bekar", "sharam", "ghatiya"],
    "concern": ["worried", "please", "help", "request", "hope", "need", "want",
                "chinta", "madad", "umeed", "zarurat"],
    "positive": ["thank", "good", "great", "fixed", "resolved", "better", "improved",
                 "shukriya", "accha", "sahi", "theek"],
}

# Severity amplifiers
SEVERITY_AMPLIFIERS = [
    "very", "extremely", "highly", "massive", "huge", "terrible", "worst",
    "bahut", "bohot", "ekdum", "bilkul", "poora"
]

# Location patterns for Indian addresses
LOCATION_PATTERNS = [
    r'\b(?:near|opposite|behind|beside|at|on)\s+[\w\s]+(?:road|chowk|nagar|colony|society|park|school|hospital|temple|masjid|bridge)\b',
    r'\b[\w]+\s+(?:road|marg|gali|chowk|circle|cross|naka)\b',
    r'\b(?:ward|zone|sector|block|phase)\s*[#-]?\s*\d+\b',
]


def analyze_sentiment(text: str) -> Dict:
    """
    Perform multi-dimensional sentiment analysis on citizen report text.
    Returns urgency level, emotion, severity score, and language detection.
    """
    if not text or not text.strip():
        return {
            "urgency": "low",
            "urgency_score": 0.1,
            "emotion": "neutral",
            "emotion_confidence": 0.5,
            "severity_score": 0.2,
            "language_detected": "en",
            "key_phrases": [],
            "has_location": False,
            "amplified": False,
        }

    text_lower = text.lower().strip()
    
    # Detect language
    lang = _detect_language(text_lower)
    
    # Calculate urgency
    urgency, urgency_score = _calculate_urgency(text_lower)
    
    # Detect emotion
    emotion, emotion_confidence = _detect_emotion(text_lower)
    
    # Calculate severity from language intensity
    severity_score = _calculate_severity(text_lower, urgency_score)
    
    # Check for amplifiers
    amplified = any(amp in text_lower for amp in SEVERITY_AMPLIFIERS)
    if amplified:
        severity_score = min(1.0, severity_score * 1.3)
        urgency_score = min(1.0, urgency_score * 1.2)
    
    # Extract key phrases
    key_phrases = _extract_key_phrases(text_lower)
    
    # Check for location mentions
    has_location = _has_location(text)
    
    return {
        "urgency": urgency,
        "urgency_score": round(urgency_score, 2),
        "emotion": emotion,
        "emotion_confidence": round(emotion_confidence, 2),
        "severity_score": round(severity_score, 2),
        "language_detected": lang,
        "key_phrases": key_phrases[:5],
        "has_location": has_location,
        "amplified": amplified,
    }


def analyze_batch(texts: List[str]) -> Dict:
    """
    Analyze multiple texts and return aggregate sentiment metrics.
    Useful for understanding overall citizen mood about city conditions.
    """
    if not texts:
        return {"count": 0, "avg_urgency": 0, "avg_severity": 0, "emotions": {}, "top_phrases": []}
    
    results = [analyze_sentiment(t) for t in texts]
    
    avg_urgency = sum(r["urgency_score"] for r in results) / len(results)
    avg_severity = sum(r["severity_score"] for r in results) / len(results)
    
    # Count emotions
    emotion_counts: Dict[str, int] = {}
    for r in results:
        em = r["emotion"]
        emotion_counts[em] = emotion_counts.get(em, 0) + 1
    
    # Collect all key phrases
    all_phrases: Dict[str, int] = {}
    for r in results:
        for phrase in r["key_phrases"]:
            all_phrases[phrase] = all_phrases.get(phrase, 0) + 1
    
    top_phrases = sorted(all_phrases.items(), key=lambda x: x[1], reverse=True)[:10]
    
    urgency_dist = {}
    for r in results:
        u = r["urgency"]
        urgency_dist[u] = urgency_dist.get(u, 0) + 1
    
    return {
        "count": len(texts),
        "avg_urgency": round(avg_urgency, 2),
        "avg_severity": round(avg_severity, 2),
        "dominant_emotion": max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral",
        "emotions": emotion_counts,
        "urgency_distribution": urgency_dist,
        "top_phrases": [{"phrase": p, "count": c} for p, c in top_phrases],
    }


def _detect_language(text: str) -> str:
    """Simple language detection based on character patterns."""
    # Check for Devanagari (Hindi)
    if re.search(r'[\u0900-\u097F]', text):
        return "hi"
    # Check for Gujarati
    if re.search(r'[\u0A80-\u0AFF]', text):
        return "gu"
    # Check for common Hindi transliteration patterns
    hindi_markers = ["hai", "ho", "ka", "ki", "ke", "mein", "ko", "se", "par", "nahi", "kya", "yeh", "woh"]
    hindi_count = sum(1 for m in hindi_markers if f" {m} " in f" {text} ")
    if hindi_count >= 2:
        return "hi_transliterated"
    return "en"


def _calculate_urgency(text: str) -> Tuple[str, float]:
    """Calculate urgency level from text."""
    critical_count = 0
    high_count = 0
    moderate_count = 0
    
    for lang_keywords in URGENCY_KEYWORDS["critical"].values():
        critical_count += sum(1 for kw in lang_keywords if kw in text)
    for lang_keywords in URGENCY_KEYWORDS["high"].values():
        high_count += sum(1 for kw in lang_keywords if kw in text)
    for lang_keywords in URGENCY_KEYWORDS["moderate"].values():
        moderate_count += sum(1 for kw in lang_keywords if kw in text)
    
    if critical_count >= 2:
        return "critical", min(1.0, 0.85 + critical_count * 0.05)
    if critical_count >= 1:
        return "critical", 0.8
    if high_count >= 2:
        return "high", min(0.79, 0.6 + high_count * 0.05)
    if high_count >= 1:
        return "high", 0.6
    if moderate_count >= 2:
        return "moderate", min(0.59, 0.4 + moderate_count * 0.03)
    if moderate_count >= 1:
        return "moderate", 0.35
    return "low", 0.15


def _detect_emotion(text: str) -> Tuple[str, float]:
    """Detect dominant emotion in text."""
    scores: Dict[str, int] = {}
    for emotion, keywords in EMOTION_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[emotion] = score
    
    if not scores:
        return "neutral", 0.5
    
    dominant = max(scores, key=scores.get)
    total_matches = sum(scores.values())
    confidence = min(0.95, 0.5 + (scores[dominant] / max(total_matches, 1)) * 0.4)
    
    return dominant, confidence


def _calculate_severity(text: str, urgency_score: float) -> float:
    """Calculate severity score from 0-1 based on text content."""
    base = urgency_score * 0.6
    
    # Length factor - longer texts tend to indicate more detail / more severe
    word_count = len(text.split())
    length_factor = min(0.15, word_count / 100)
    
    # Exclamation/caps factor
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    exclamation_count = text.count('!')
    intensity = min(0.15, caps_ratio * 0.5 + exclamation_count * 0.03)
    
    # Number mentions (often indicate scale)
    numbers = re.findall(r'\d+', text)
    number_factor = min(0.1, len(numbers) * 0.02)
    
    return min(1.0, base + length_factor + intensity + number_factor)


def _extract_key_phrases(text: str) -> List[str]:
    """Extract key phrases from text using pattern matching."""
    phrases = []
    
    # Issue type phrases
    issue_patterns = [
        r'\b(road\s*(?:damage|block|closed|jam|accident))',
        r'\b(water\s*(?:logging|leak|shortage|overflow|supply))',
        r'\b(garbage\s*(?:dump|overflow|collection|pile|smell))',
        r'\b(street\s*(?:light|lamp)\s*(?:not working|broken|off|dark))',
        r'\b(traffic\s*(?:jam|signal|congestion|accident|block))',
        r'\b(power\s*(?:cut|outage|failure))',
        r'\b(sewage\s*(?:overflow|leak|block|smell))',
    ]
    
    for pattern in issue_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        phrases.extend(matches)
    
    # Temporal phrases
    temporal = re.findall(r'\b(since\s+\w+|for\s+\d+\s+\w+|from\s+\w+)\b', text)
    phrases.extend(temporal)
    
    return list(set(phrases))


def _has_location(text: str) -> bool:
    """Check if text contains location information."""
    for pattern in LOCATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    
    # Check for common Vadodara area names
    vadodara_areas = [
        "alkapuri", "gotri", "akota", "fatehgunj", "manjalpur", "sayajigunj",
        "karelibaug", "waghodia", "vasna", "makarpura", "gorwa", "tandalja",
        "subhanpura", "nizampura", "sama", "chhani", "dabhoi"
    ]
    text_lower = text.lower()
    return any(area in text_lower for area in vadodara_areas)
