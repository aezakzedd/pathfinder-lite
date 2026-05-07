from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
GEOJSON_PATH = ROOT / "public" / "data" / "catanduanes_datafile.geojson"

CATEGORY_GROUPS = {
    "Water": {"beach", "swimming", "falls", "beach_resort"},
    "Outdoor": {"hike", "nature"},
    "Views": {"viewpoint"},
    "Heritage": {"religious", "history", "culture", "indoor"},
    "Dining": {"food"},
    "Stay": {"accommodation", "beach_resort"},
}

BUDGET_ORDER = {"low": 0, "medium": 1, "high": 2}


@dataclass(frozen=True)
class Place:
    id: str
    name: str
    description: str
    municipality: str
    type: str
    category: str
    category_group: str
    coordinates: tuple[float, float]
    image: str
    min_budget: str
    best_time_of_day: str
    outdoor_exposure: str
    visit_time_minutes: int
    is_top_10: bool
    search_text: str
    slug: str

    def to_location(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "municipality": self.municipality,
            "category": self.category,
            "type": self.type,
            "coordinates": [self.coordinates[0], self.coordinates[1]],
        }


class KnowledgeBase:
    def __init__(self, geojson_path: Path = GEOJSON_PATH):
        self.geojson_path = geojson_path
        self.places = self._load_places()
        self.by_id = {place.id: place for place in self.places}
        self.by_slug = {place.slug: place for place in self.places}
        self.municipalities = sorted({place.municipality for place in self.places if place.municipality})

    def match_place(self, query: str, active_pin: dict[str, Any] | None = None) -> Place | None:
        matches = self.search_places(query, active_pin=active_pin, limit=1)
        return matches[0] if matches else None

    def search_places(
        self,
        query: str,
        *,
        active_pin: dict[str, Any] | None = None,
        limit: int = 5,
        categories: set[str] | None = None,
        municipality: str | None = None,
        budget: str | None = None,
    ) -> list[Place]:
        normalized_query = normalize_text(query)
        query_tokens = set(tokenize(query))
        active_place = self.resolve_active_pin(active_pin)
        results: list[tuple[float, Place]] = []

        for place in self.places:
            if categories and place.category not in categories and place.category_group not in categories:
                continue
            if municipality and normalize_text(place.municipality) != normalize_text(municipality):
                continue
            if budget and BUDGET_ORDER.get(place.min_budget, 0) > BUDGET_ORDER.get(normalize_budget(budget), 0):
                continue

            score = score_place(place, normalized_query, query_tokens)
            if active_place and active_place.id == place.id:
                score += 8
            if score >= 8:
                results.append((score, place))

        results.sort(key=lambda item: (-item[0], not item[1].is_top_10, item[1].name))
        return [place for _, place in results[:limit]]

    def recommend(
        self,
        query: str,
        *,
        active_pin: dict[str, Any] | None = None,
        budget: str | None = None,
        activities: list[str] | None = None,
        categories: set[str] | None = None,
        limit: int = 4,
        exclude_ids: set[str] | None = None,
    ) -> list[Place]:
        query_text = normalize_text(query)
        categories = categories or infer_categories(query_text, activities)
        municipality = infer_municipality(query_text, self.municipalities)
        resolved_budget = infer_budget(query_text) or budget
        active_place = self.resolve_active_pin(active_pin)
        exclude_ids = exclude_ids or set()

        candidates = []
        for place in self.places:
            if place.id in exclude_ids:
                continue
            if categories and place.category not in categories and place.category_group not in categories:
                continue
            if municipality and normalize_text(place.municipality) != normalize_text(municipality):
                continue
            if resolved_budget and BUDGET_ORDER.get(place.min_budget, 0) > BUDGET_ORDER.get(normalize_budget(resolved_budget), 0):
                continue

            score = 0.0
            if place.is_top_10:
                score += 4
            if categories:
                score += 3
            if resolved_budget and place.min_budget == "low":
                score += 1.5
            if active_place:
                if place.municipality == active_place.municipality:
                    score += 4
                score -= min(calculate_distance(active_place.coordinates, place.coordinates), 40) / 10
            else:
                score -= BUDGET_ORDER.get(place.min_budget, 0) * 0.4

            candidates.append((score, place))

        candidates.sort(key=lambda item: (-item[0], not item[1].is_top_10, item[1].name))
        return [place for _, place in candidates[:limit]]

    def nearby(
        self,
        origin: Place,
        *,
        query: str = "",
        limit: int = 4,
        categories: set[str] | None = None,
        exclude_ids: set[str] | None = None,
    ) -> list[Place]:
        exclude_ids = exclude_ids or {origin.id}
        query_categories = categories or infer_categories(normalize_text(query), None)
        results = []

        for place in self.places:
            if place.id in exclude_ids:
                continue
            if query_categories and place.category not in query_categories and place.category_group not in query_categories:
                continue
            distance = calculate_distance(origin.coordinates, place.coordinates)
            municipality_boost = -2 if place.municipality == origin.municipality else 0
            results.append((distance + municipality_boost, place))

        results.sort(key=lambda item: (item[0], not item[1].is_top_10, item[1].name))
        return [place for _, place in results[:limit]]

    def resolve_active_pin(self, active_pin: dict[str, Any] | None) -> Place | None:
        if not active_pin:
            return None
        pin_id = active_pin.get("id")
        if pin_id is not None and str(pin_id) in self.by_id:
            return self.by_id[str(pin_id)]
        pin_name = active_pin.get("name")
        if pin_name:
            return self.by_slug.get(slugify(pin_name)) or self.match_place(str(pin_name))
        return None

    def _load_places(self) -> list[Place]:
        data = json.loads(self.geojson_path.read_text(encoding="utf-8"))
        places = []
        for feature in data.get("features", []):
            geometry = feature.get("geometry") or {}
            if geometry.get("type") != "Point":
                continue
            properties = feature.get("properties") or {}
            coordinates = geometry.get("coordinates") or []
            if len(coordinates) < 2:
                continue

            name = str(properties.get("name") or "").strip()
            if not name:
                continue

            category = normalize_category(properties.get("category") or properties.get("type"))
            category_group = category_to_group(category)
            place_id = str(properties.get("id") or properties.get("OBJECTID") or name)
            municipality = title_case(properties.get("municipality") or properties.get("MUNICIPALI") or "")
            description = str(properties.get("description") or "").strip()
            place_type = str(properties.get("type") or "").strip()
            best_time = str(properties.get("best_time_of_day") or "any").strip()
            exposure = str(properties.get("outdoor_exposure") or "").strip()
            min_budget = normalize_budget(properties.get("min_budget"))
            visit_minutes = normalize_visit_minutes(properties.get("visit_time_minutes"))
            image = str(properties.get("image") or "").strip()
            search_text = normalize_text(" ".join([
                name,
                municipality,
                place_type,
                category,
                category_group,
                description,
            ]))

            places.append(Place(
                id=place_id,
                name=name,
                description=description,
                municipality=municipality,
                type=place_type,
                category=category,
                category_group=category_group,
                coordinates=(float(coordinates[0]), float(coordinates[1])),
                image=image,
                min_budget=min_budget,
                best_time_of_day=best_time,
                outdoor_exposure=exposure,
                visit_time_minutes=visit_minutes,
                is_top_10=bool(properties.get("is_top_10")),
                search_text=search_text,
                slug=slugify(name),
            ))
        return places


@lru_cache(maxsize=1)
def get_knowledge_base() -> KnowledgeBase:
    return KnowledgeBase()


def score_place(place: Place, normalized_query: str, query_tokens: set[str]) -> float:
    if not normalized_query:
        return 0
    score = 0.0
    name_text = normalize_text(place.name)
    municipality = normalize_text(place.municipality)
    category = normalize_text(place.category)
    category_group = normalize_text(place.category_group)

    if normalized_query == name_text or slugify(normalized_query) == place.slug:
        score += 100
    if normalized_query in name_text or name_text in normalized_query:
        score += 40
    if query_tokens:
        name_tokens = set(tokenize(place.name))
        overlap = query_tokens & name_tokens
        score += len(overlap) * 8
    if municipality and municipality in normalized_query:
        score += 8
    if category in normalized_query or category_group in normalized_query:
        score += 6
    if any(token in place.search_text for token in query_tokens):
        score += 2
    if place.is_top_10:
        score += 2
    return score


def infer_categories(query_text: str, activities: list[str] | None = None) -> set[str]:
    categories: set[str] = set()
    for activity in activities or []:
        categories.update(CATEGORY_GROUPS.get(str(activity), set()))

    keyword_map = {
        "beach": {"beach", "beach_resort", "swimming"},
        "beaches": {"beach", "beach_resort", "swimming"},
        "water": CATEGORY_GROUPS["Water"],
        "swim": CATEGORY_GROUPS["Water"],
        "falls": {"falls"},
        "waterfall": {"falls"},
        "hike": {"hike", "nature"},
        "outdoor": CATEGORY_GROUPS["Outdoor"],
        "view": CATEGORY_GROUPS["Views"],
        "viewpoint": CATEGORY_GROUPS["Views"],
        "church": {"religious"},
        "heritage": CATEGORY_GROUPS["Heritage"],
        "history": {"history", "culture", "religious"},
        "food": CATEGORY_GROUPS["Dining"],
        "restaurant": CATEGORY_GROUPS["Dining"],
        "cafe": CATEGORY_GROUPS["Dining"],
        "eat": CATEGORY_GROUPS["Dining"],
        "dining": CATEGORY_GROUPS["Dining"],
        "stay": CATEGORY_GROUPS["Stay"],
        "hotel": CATEGORY_GROUPS["Stay"],
        "resort": CATEGORY_GROUPS["Stay"],
    }
    for keyword, mapped in keyword_map.items():
        if keyword in query_text:
            categories.update(mapped)
    return categories


def infer_budget(query_text: str) -> str | None:
    if any(word in query_text for word in ("cheap", "cheaper", "budget", "affordable", "low cost", "free")):
        return "low"
    if any(word in query_text for word in ("mid", "medium", "moderate")):
        return "medium"
    if any(word in query_text for word in ("premium", "expensive", "high budget")):
        return "high"
    return None


def infer_municipality(query_text: str, municipalities: list[str]) -> str | None:
    for municipality in municipalities:
        if normalize_text(municipality) in query_text:
            return municipality
    return None


def calculate_distance(first: tuple[float, float], second: tuple[float, float]) -> float:
    earth_radius_km = 6371.0
    lng1, lat1 = map(math.radians, first)
    lng2, lat2 = map(math.radians, second)
    delta_lat = lat2 - lat1
    delta_lng = lng2 - lng1
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * (math.sin(delta_lng / 2) ** 2)
    )
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def category_to_group(category: str) -> str:
    for group, categories in CATEGORY_GROUPS.items():
        if category in categories:
            return group
    if category in {"food"}:
        return "Dining"
    if category in {"transport", "shopping"}:
        return "Views"
    return "Outdoor"


def normalize_budget(value: Any = "low") -> str:
    raw = normalize_text(value)
    if "high" in raw or "600" in raw or raw in {"php phpphp", "ppp"}:
        return "high"
    if "medium" in raw or "mid" in raw or "200" in raw or raw in {"phpphp", "pp"}:
        return "medium"
    return "low"


def normalize_visit_minutes(value: Any) -> int:
    try:
        minutes = int(float(value))
    except (TypeError, ValueError):
        return 60
    return max(0, min(240, minutes))


def normalize_category(value: Any = "") -> str:
    return normalize_text(value).replace(" ", "_")


def normalize_text(value: Any = "") -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def tokenize(value: Any = "") -> list[str]:
    return [token for token in normalize_text(value).split() if len(token) > 1]


def slugify(value: Any = "") -> str:
    return "-".join(tokenize(value))


def title_case(value: Any = "") -> str:
    return str(value or "").strip().lower().title()
