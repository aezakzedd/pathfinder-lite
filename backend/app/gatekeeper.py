"""Gatekeeping module — rate limit, profanity, gibberish, intent classification.
Lightweight pure-Python implementation with zero ML dependencies.
"""
from __future__ import annotations

import math
import re
import time
import unicodedata
from collections import deque


# -----------------------------------------------------------------------------
# RATE LIMITER
# -----------------------------------------------------------------------------
class RateLimiter:
    """Sliding-window throttle keyed by session_id."""

    def __init__(self, max_request: int = 6, period_seconds: int = 70):
        self.max_request = max_request
        self.period_seconds = period_seconds
        self._windows: dict[str, deque[float]] = {}

    def is_allowed(self, session_id: str) -> bool:
        now = time.time()
        window = self._windows.setdefault(session_id, deque())
        while window and window[0] < now - self.period_seconds:
            window.popleft()
        if len(window) < self.max_request:
            window.append(now)
            return True
        return False

    def get_remaining_time(self, session_id: str) -> int:
        window = self._windows.get(session_id)
        if not window:
            return 0
        now = time.time()
        expiry = window[0] + self.period_seconds
        return max(0, int(expiry - now))


# -----------------------------------------------------------------------------
# PROFANITY FILTER
# -----------------------------------------------------------------------------
class ProfanityFilter:
    """Simple word-list profanity filter (EN + TL). No external deps."""

    # Compact combined list — covers most common EN + TL vulgarities
    _BAD_WORDS = {
        # English
        "fuck", "shit", "bitch", "asshole", "damn", "cunt", "dick",
        "pussy", "cock", "bastard", "slut", "whore", "retard",
        # Tagalog / Filipino vulgarities
        "putang", "puta", "tangina", "tanga", "gago", "bobo", "tarantado",
        "ulol", "loko", "bwisit", "bwiset", "leche", "lintik", "hinayupak",
        "pakshet", "pucha", "puchang", "inutil", "gunggong", "tanga",
        "engot", "eut", "kantot", "kantutan", "iyot", "iyotan",
        "puki", "pekpek", "tit", "titi", "burat", "bayag",
        "poke", "pokpok", "kupal", "latigo",
    }

    def contains_profanity(self, text: str) -> bool:
        normalized = self._normalize(text)
        words = normalized.split()
        for word in words:
            if word in self._BAD_WORDS:
                return True
            # Check sub-word matches for compound profanity
            for bad in self._BAD_WORDS:
                if bad in word and len(bad) >= 4:
                    return True
        return False

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower().strip()
        text = "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )
        # Remove repeated chars beyond 2 (e.g., fuuuck → fuck)
        text = re.sub(r"(.)\1{2,}", r"\1\1", text)
        return text


# -----------------------------------------------------------------------------
# GIBBERISH DETECTOR
# -----------------------------------------------------------------------------
class GibberishDetector:
    """Heuristic gibberish detection — zero ML, pure regex + ratios."""

    MAX_CONSONANT_RUN = 5
    MIN_LENGTH_FOR_CHECKS = 3

    VOWELS = set("aeiouy")

    ALLOW_LIST = {
        "pathfinder", "catanduanes", "hardware", "software", "raspberry", "pi",
        "virac", "bato", "baras", "pandan", "viga", "gigmoto",
        "panganiban", "bagamanoc", "caramoran", "san miguel", "san andres",
        "puraran", "beaches", "falls", "cave", "church", "bus", "van",
        "kumusta", "kamusta", "musta", "salamat", "opo", "hindi",
    }

    RE_REPEATED_CHARS = re.compile(r"(.)\1{3,}")

    KEYBOARD_SEQUENCES = [
        "asdfghjkl", "qwertyuiop", "zxcvbnm", "1234567890",
        "lkjhgfdsa", "poiuytrewq", "mnbvcxz", "0987654321",
    ]

    def is_gibberish(self, text: str) -> bool:
        if not text:
            return False

        clean = self._normalize(text)
        text_len = len(clean)

        if clean in self.ALLOW_LIST:
            return False
        if text_len < self.MIN_LENGTH_FOR_CHECKS:
            return False

        # Repeated characters check
        if self.RE_REPEATED_CHARS.search(clean):
            return True

        # Unique character ratio check
        no_space = clean.replace(" ", "")
        char_len = len(no_space)
        if char_len > 0:
            unique_chars = len(set(no_space))
            unique_ratio = unique_chars / char_len
            threshold = min(0.50, 2.0 / math.sqrt(char_len))
            if unique_ratio < threshold:
                return True

        # Consonant run check
        consonant_run = 0
        max_run = 0
        for char in clean:
            if char.isalpha():
                if char not in self.VOWELS:
                    consonant_run += 1
                else:
                    max_run = max(max_run, consonant_run)
                    consonant_run = 0
            else:
                max_run = max(max_run, consonant_run)
                consonant_run = 0
        if max(max_run, consonant_run) > self.MAX_CONSONANT_RUN:
            return True

        # Keyboard sequence check (only for short text)
        if 3 < text_len <= 15:
            for pattern in self.KEYBOARD_SEQUENCES:
                if clean in pattern:
                    return True

        return False

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower().strip()
        return "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )


# -----------------------------------------------------------------------------
# INTENT CLASSIFIER
# -----------------------------------------------------------------------------
class IntentClassifier:
    """Pure-keyword intent classifier — no embeddings needed."""

    GREETINGS = {
        "hi", "hello", "hey", "kumusta", "good morning", "good afternoon",
        "good evening", "musta", "kamusta", "yo", "hoy", "oy", "po",
    }

    QUESTION_INDICATORS = {
        "what", "where", "how", "when", "who", "why", "which",
        "can", "is", "are", "do", "does", "will", "should",
        "tell", "show", "give", "list", "recommend", "suggest",
        "ano", "saan", "paano", "kailan", "sino", "bakit",
        "may", "meron", "pwede", "gusto", "magkano", "alin",
    }

    TOURISM_KEYWORDS = {
        "beach", "beaches", "surf", "surfing", "falls", "waterfall",
        "cave", "church", "heritage", "food", "restaurant", "dining",
        "hotel", "resort", "stay", "accommodation", "activity",
        "activities", "tour", "spot", "places", "destination",
        "puraran", "binurong", "twin rock", "mamangal", "bato",
        "virac", "baras", "pandan", "viga", "gigmoto", "caramoran",
        "bagamanoc", "panganiban", "san miguel", "san andres",
        "swimming", "hiking", "view", "sunset", "sunrise",
        "island", "island hopping", "snorkeling", "diving",
        "budget", "cheap", "expensive", "price", "cost", "fee",
        "entrance", "bayad", "magkano", "mura", "mahal",
    }

    def analyze(self, text: str) -> dict:
        clean = self._normalize(text)

        if len(clean) < 2:
            return {
                "intent": "nonsense",
                "is_valid": False,
                "confidence": 0.0,
                "reason": "too_short",
            }

        has_greeting = any(g == clean for g in self.GREETINGS)
        if not has_greeting:
            has_greeting = any(g in clean.split() for g in self.GREETINGS)

        has_question = any(q in clean.split() for q in self.QUESTION_INDICATORS)
        has_tourism = any(kw in clean for kw in self.TOURISM_KEYWORDS)

        confidence = 0.0
        if has_tourism:
            confidence += 0.6
        if has_question:
            confidence += 0.3
        if has_greeting:
            confidence += 0.1

        if confidence >= 0.5:
            return {
                "intent": "tourism_query",
                "is_valid": True,
                "confidence": min(confidence, 1.0),
                "reason": "scored_as_tourism",
            }
        elif has_greeting:
            return {
                "intent": "greeting",
                "is_valid": True,
                "confidence": 1.0,
                "reason": "greeting_only",
            }
        else:
            return {
                "intent": "nonsense",
                "is_valid": False,
                "confidence": 0.3,
                "reason": "uncertain",
            }

    @staticmethod
    def greeting_response() -> str:
        return (
            "Hello! I'm Pathfinder, your Catanduanes tourism guide. "
            "Ask me about beaches, food, activities, or where to stay!"
        )

    @staticmethod
    def nonsense_response() -> str:
        return (
            "I'm sorry, I didn't understand that. Try asking about beaches, "
            "surfing, food, accommodations, or activities in Catanduanes!"
        )

    @staticmethod
    def profanity_response() -> str:
        return "I cannot process that language. Please keep the conversation respectful."

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower().strip()
        return "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )


# -----------------------------------------------------------------------------
# SINGLETON INSTANCE
# -----------------------------------------------------------------------------
limiter = RateLimiter(max_request=6, period_seconds=70)
profanity_filter = ProfanityFilter()
gibberish_detector = GibberishDetector()
intent_classifier = IntentClassifier()
