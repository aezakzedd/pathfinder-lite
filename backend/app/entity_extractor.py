from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

# Load keyword config once at module import time
_KEYWORDS_PATH = Path(__file__).resolve().parents[1] / "data" / "chatbot" / "keywords.json"


def _load_keywords() -> dict[str, Any]:
    try:
        return json.loads(_KEYWORDS_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


_KEYWORDS = _load_keywords()

# Fallback municipalities (will be overridden by KB if available)
_DEFAULT_MUNICIPALITIES = [
    "virac", "baras", "pandan", "bato", "gigmoto",
    "san andres", "bagamanoc", "viga", "caramoran",
    "panganiban", "san miguel",
]


class EntityExtractor:
    """Lightweight regex-based entity extractor for tourism queries."""

    def __init__(
        self,
        place_names: list[str] | None = None,
        municipalities: list[str] | None = None,
    ) -> None:
        self.place_names = sorted(
            (place_names or []),
            key=len,
            reverse=True,
        )
        self.municipalities = sorted(
            (municipalities or _DEFAULT_MUNICIPALITIES),
            key=len,
            reverse=True,
        )
        self.keywords = _KEYWORDS

    def extract(self, user_input: str) -> dict[str, Any]:
        """Extract structured entities from user input."""
        query_lower = user_input.lower()

        found_places = self._extract_places(query_lower)

        return {
            "places": found_places,
            "activities": self._extract_activities(query_lower),
            "budget": self._extract_budget(query_lower),
            "group_type": self._extract_group_type(query_lower),
            "time_period": self._extract_time_period(query_lower),
            "proximity": self._extract_proximity(query_lower),
            "inferred_town": self._infer_municipality(query_lower),
            "is_listing": self._detect_listing_intent(user_input, found_places),
        }

    def _extract_places(self, query_lower: str) -> list[str]:
        """Extract place names mentioned in query."""
        found: list[str] = []
        clean_input = re.sub(r"[^\w\s]", " ", query_lower)

        for place in self.place_names:
            clean_place = re.sub(r"[^\w\s]", " ", place.lower())
            if clean_place in clean_input:
                found.append(place)
                clean_input = clean_input.replace(clean_place, "")

        for municipality in self.municipalities:
            if municipality in clean_input and municipality.title() not in found:
                found.append(municipality.title())

        return found

    def _extract_activities(self, query_lower: str) -> list[str]:
        """Extract activity types using keyword synonym expansion."""
        activities_cfg = self.keywords.get("activities", {})
        compound = self.keywords.get("compound_phrases", {})

        # Mask compound phrases first
        cleaned = query_lower
        for phrase, replacement in sorted(
            compound.items(), key=lambda x: len(x[0]), reverse=True
        ):
            if phrase in cleaned:
                cleaned = cleaned.replace(phrase, replacement)

        found: list[str] = []
        for topic, keywords in activities_cfg.items():
            pattern = r"\b(" + "|".join(re.escape(kw) for kw in keywords) + r")s?\b"
            if re.search(pattern, cleaned):
                found.append(topic)

        # Snorkeling should be explicit
        has_snorkel = bool(re.search(r"\bsnorkel(?:ing)?\b", cleaned))
        has_non_snorkel_swim = bool(
            re.search(
                r"\b(swim|swimming|langoy|ligo|maliligo|pool|falls?|talon|"
                r"waterfall|waterfalls|dive|diving|freediving|cliff diving|"
                r"cliff jump|spring)\b",
                cleaned,
            )
        )

        if has_snorkel and "snorkeling" not in found:
            found.append("snorkeling")

        if has_snorkel and not has_non_snorkel_swim and "swimming" in found:
            found = [a for a in found if a != "swimming"]

        return found

    def _extract_budget(self, query_lower: str) -> str | None:
        """Extract budget preference."""
        budget_cfg = self.keywords.get("budget_indicators", {})
        for budget, indicators in budget_cfg.items():
            pattern = r"\b(" + "|".join(re.escape(kw) for kw in indicators) + r")\b"
            if re.search(pattern, query_lower):
                return budget
        return None

    def _extract_group_type(self, query_lower: str) -> str | None:
        """Extract group type."""
        group_cfg = self.keywords.get("group_types", {})
        for group, indicators in group_cfg.items():
            pattern = r"\b(" + "|".join(re.escape(kw) for kw in indicators) + r")\b"
            if re.search(pattern, query_lower):
                return group
        return None

    def _extract_time_period(self, query_lower: str) -> str | None:
        """Extract time period preference."""
        time_cfg = self.keywords.get("time_periods", {})
        for period, indicators in time_cfg.items():
            pattern = r"\b(" + "|".join(re.escape(kw) for kw in indicators) + r")\b"
            if re.search(pattern, query_lower):
                return period
        return None

    def _extract_proximity(self, query_lower: str) -> str | None:
        """Extract proximity indicators."""
        prox_cfg = self.keywords.get("proximity_patterns", {})
        for prox_type, indicators in prox_cfg.items():
            pattern = r"\b(" + "|".join(re.escape(kw) for kw in indicators) + r")\b"
            if re.search(pattern, query_lower):
                return prox_type
        return None

    def _infer_municipality(self, query_lower: str) -> str | None:
        """Infer municipality from implicit hints."""
        hints = {
            "airport": "Virac",
            "downtown": "Virac",
            "capital": "Virac",
            "town center": "Virac",
            "public market": "Virac",
            "town proper": "Virac",
        }
        for keyword, town in hints.items():
            if keyword in query_lower:
                return town
        return None

    def _detect_listing_intent(self, query: str, found_places: list[str]) -> bool:
        """Detect if user wants a list / browsing experience."""
        query_lower = query.lower()
        listing_signals = self.keywords.get("listing_signals", [])

        if any(kw in query_lower for kw in listing_signals):
            return True

        plural_types = self.keywords.get("plural_place_types", [])
        has_plural = any(plural in query_lower for plural in plural_types)

        # Specific spots = named places that are NOT municipalities
        specific_spots = [
            p for p in found_places
            if p.lower() not in {m.lower() for m in self.municipalities}
        ]

        if has_plural and len(specific_spots) == 0:
            return True

        # Town-only query with no specific spot
        if re.search(
            r"\b(in|at|around|near)\s+(virac|baras|pandan|bato|gigmoto|san andres)\b",
            query_lower,
        ):
            if len(specific_spots) == 0:
                return True

        return False

    def build_enhanced_query(self, entities: dict[str, Any]) -> str:
        """Build a richer search query from extracted entities."""
        parts: list[str] = []
        if entities.get("activities"):
            parts.extend(entities["activities"])
        if entities.get("places"):
            parts.extend(entities["places"])
        if entities.get("budget"):
            parts.append(entities["budget"])
        if entities.get("group_type"):
            parts.append(entities["group_type"])
        if entities.get("time_period"):
            parts.append(entities["time_period"])
        return " ".join(parts)
