from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .dialogue_state import DialogueMemory
from .knowledge_base import (
    BUDGET_ORDER,
    Place,
    KnowledgeBase,
    boost_ids_from_rules,
    budget_from_rules,
    calculate_distance,
    categories_from_rules,
    infer_budget,
    infer_categories,
    normalize_budget,
    normalize_text,
)
from .route_cache import build_cached_route_response


MAX_DAY_COUNT = 7
MAX_DAY_MINUTES = 8 * 60

HUBS = {
    "virac": {"name": "Virac", "coordinates": (124.23, 13.58)},
    "san andres": {"name": "San Andres", "coordinates": (124.10, 13.60)},
}

PACE_STOPS = {
    "relaxed": 2,
    "balanced": 3,
    "packed": 4,
}

PACE_CAPACITY = {
    "relaxed": 390,
    "balanced": MAX_DAY_MINUTES,
    "packed": MAX_DAY_MINUTES,
}

DEFAULT_TOURISM_CATEGORIES = {
    "beach",
    "beach_resort",
    "falls",
    "hike",
    "nature",
    "viewpoint",
    "religious",
    "history",
    "culture",
    "indoor",
}

ITINERARY_WORDS = ("itinerary", "plan", "schedule", "day trip", "trip")


@dataclass
class ItineraryConstraints:
    day_count: int
    start_point: str
    start_coordinates: tuple[float, float]
    categories: set[str]
    budget: str | None
    pace: str
    avoids: set[str]


@dataclass
class PlannedItinerary:
    days: dict[str, list[dict[str, Any]]]
    summary: dict[str, Any]
    places: list[Place]
    constraints: ItineraryConstraints


def build_itinerary_plan(
    kb: KnowledgeBase,
    question: str,
    *,
    active_pin: dict[str, Any] | None = None,
    memory: DialogueMemory | None = None,
) -> PlannedItinerary:
    constraints = parse_itinerary_constraints(kb, question, memory=memory)
    rules = kb.match_recommendation_rules(normalize_text(question))
    boosted_ids = boost_ids_from_rules(rules)
    candidates = build_candidate_pool(kb, constraints, boosted_ids)
    if not candidates:
        relaxed = ItineraryConstraints(
            day_count=constraints.day_count,
            start_point=constraints.start_point,
            start_coordinates=constraints.start_coordinates,
            categories=set(),
            budget=constraints.budget,
            pace=constraints.pace,
            avoids=constraints.avoids,
        )
        candidates = build_candidate_pool(kb, relaxed, boosted_ids)

    used_ids: set[str] = set()
    days: dict[str, list[dict[str, Any]]] = {}
    selected_places: list[Place] = []
    estimated_total_minutes = 0
    route_source = "estimate"

    for day in range(1, constraints.day_count + 1):
        current_coordinates = constraints.start_coordinates
        day_minutes = 0
        day_stops: list[Place] = []

        for _ in range(PACE_STOPS[constraints.pace]):
            next_place = choose_next_place(
                candidates,
                constraints,
                current_coordinates,
                used_ids,
                day_stops,
                boosted_ids,
            )
            if not next_place:
                break

            travel_minutes, source = estimate_travel_minutes(current_coordinates, next_place.coordinates)
            visit_minutes = max(30, int(next_place.visit_time_minutes or 60))
            projected_minutes = day_minutes + travel_minutes + visit_minutes
            if day_stops and projected_minutes > PACE_CAPACITY[constraints.pace]:
                break

            day_stops.append(next_place)
            used_ids.add(next_place.id)
            selected_places.append(next_place)
            day_minutes += travel_minutes + visit_minutes
            current_coordinates = next_place.coordinates
            if source == "local-road-router":
                route_source = source

        days[str(day)] = [place_to_action_location(place) for place in day_stops]
        estimated_total_minutes += day_minutes

    if not any(days.values()) and candidates:
        first = candidates[0]
        days["1"] = [place_to_action_location(first)]
        selected_places.append(first)
        estimated_total_minutes = max(30, int(first.visit_time_minutes or 60))

    summary = {
        "day_count": constraints.day_count,
        "start_point": constraints.start_point,
        "pace": constraints.pace,
        "budget": constraints.budget or "mixed",
        "estimated_total_minutes": int(estimated_total_minutes),
        "route_source": route_source,
    }
    if constraints.categories:
        summary["categories"] = sorted(constraints.categories)
    if constraints.avoids:
        summary["avoids"] = sorted(constraints.avoids)

    return PlannedItinerary(days=days, summary=summary, places=selected_places, constraints=constraints)


def parse_itinerary_constraints(
    kb: KnowledgeBase,
    question: str,
    *,
    memory: DialogueMemory | None = None,
) -> ItineraryConstraints:
    text = normalize_text(question)
    preferences = memory.preferences if memory else {}
    previous = preferences.get("last_itinerary_constraints") if isinstance(preferences.get("last_itinerary_constraints"), dict) else {}
    rules = kb.match_recommendation_rules(text)

    day_count = parse_day_count(text, preferences.get("day_count") or previous.get("day_count") or 2)
    start_point = parse_start_point(text, preferences.get("start_point") or previous.get("start_point") or "Virac")
    hub = HUBS[normalize_text(start_point)]

    categories = infer_categories(text, preferences.get("activities"))
    categories.update(categories_from_rules(rules))
    if not categories and "another" not in text:
        categories.update(previous.get("categories") or [])

    budget = infer_budget(text) or budget_from_rules(rules) or preferences.get("budget") or previous.get("budget")
    if "budget" in text or "cheap" in text or "cheaper" in text or "affordable" in text:
        budget = "low"

    pace = parse_pace(text, previous.get("pace") or "balanced")
    avoids = parse_avoids(text)
    if previous.get("avoids") and "make it cheaper" in text:
        avoids.update(previous.get("avoids"))

    return ItineraryConstraints(
        day_count=day_count,
        start_point=hub["name"],
        start_coordinates=hub["coordinates"],
        categories=set(categories),
        budget=normalize_budget(budget) if budget else None,
        pace=pace,
        avoids=avoids,
    )


def build_replace_itinerary_action(plan: PlannedItinerary) -> dict[str, Any]:
    return {
        "type": "replace_itinerary",
        "days": plan.days,
        "summary": plan.summary,
    }


def build_add_to_day_action(
    kb: KnowledgeBase,
    question: str,
    *,
    active_pin: dict[str, Any] | None,
    memory: DialogueMemory,
) -> dict[str, Any]:
    place = kb.resolve_active_pin(active_pin)
    if not place and memory.active_place_id:
        place = kb.by_id.get(memory.active_place_id)
    if not place and memory.last_recommended_place_ids:
        place = kb.by_id.get(memory.last_recommended_place_ids[0])

    if not place:
        return {
            "answer": "Select a map pin first, then I can prepare it for a specific day.",
            "locations": [],
            "actions": [],
        }

    day_count = clamp_day_count(memory.preferences.get("day_count") or 1)
    day = min(parse_target_day(question, fallback=1), day_count)
    if is_place_in_day(memory.preferences.get("current_itinerary"), place.id, day):
        return {
            "answer": f"{place.name} is already in Day {day}.",
            "locations": [place],
            "actions": [],
        }

    return {
        "answer": f"I can add {place.name} to Day {day}. Tap Add to Day {day} to confirm.",
        "locations": [place],
        "actions": [{
            "type": "add_to_day",
            "day": day,
            "location": place_to_action_location(place),
        }],
    }


def build_remove_place_action(
    kb: KnowledgeBase,
    question: str,
    *,
    active_pin: dict[str, Any] | None,
    memory: DialogueMemory,
) -> dict[str, Any]:
    place = kb.match_place(question, active_pin=active_pin) or kb.resolve_active_pin(active_pin)
    if not place and memory.active_place_id:
        place = kb.by_id.get(memory.active_place_id)
    if not place:
        return {"answer": "Which place should I remove from the itinerary?", "locations": [], "actions": []}
    day = parse_target_day(question, fallback=0)
    action: dict[str, Any] = {
        "type": "remove_place",
        "location": place_to_action_location(place),
    }
    if day:
        action["day"] = day
    return {
        "answer": f"I can remove {place.name}{f' from Day {day}' if day else ''}. Tap Remove to confirm.",
        "locations": [place],
        "actions": [action],
    }


def build_replace_place_action(
    kb: KnowledgeBase,
    question: str,
    *,
    active_pin: dict[str, Any] | None,
    memory: DialogueMemory,
) -> dict[str, Any]:
    target = kb.resolve_active_pin(active_pin)
    if not target and memory.active_place_id:
        target = kb.by_id.get(memory.active_place_id)

    categories = infer_categories(normalize_text(question), memory.preferences.get("activities"))
    exclude_ids = {target.id} if target else set()
    replacements = kb.recommend(
        question,
        active_pin=active_pin,
        budget=memory.preferences.get("budget"),
        activities=memory.preferences.get("activities"),
        categories=categories,
        limit=3,
        exclude_ids=exclude_ids,
    )
    replacement = replacements[0] if replacements else None
    if not target or not replacement:
        return {"answer": "Which stop should I replace, and what kind of place should replace it?", "locations": replacements, "actions": []}

    day = parse_target_day(question, fallback=0)
    action: dict[str, Any] = {
        "type": "replace_place",
        "target_location": place_to_action_location(target),
        "replacement_location": place_to_action_location(replacement),
    }
    if day:
        action["day"] = day
    return {
        "answer": f"I found {replacement.name} as a replacement for {target.name}. Tap Replace to confirm.",
        "locations": [replacement],
        "actions": [action],
    }


def build_clear_itinerary_suggestion() -> dict[str, Any]:
    return {
        "answer": "I can clear the current itinerary suggestion. Tap Clear Plan to confirm.",
        "locations": [],
        "actions": [{"type": "clear_itinerary_suggestion"}],
    }


def build_candidate_pool(
    kb: KnowledgeBase,
    constraints: ItineraryConstraints,
    boosted_ids: set[str],
) -> list[Place]:
    candidates: list[tuple[float, Place]] = []
    for place in kb.places:
        if not is_itinerary_place(place, constraints):
            continue
        score = candidate_base_score(place, constraints, boosted_ids)
        candidates.append((score, place))

    candidates.sort(key=lambda item: (-item[0], not item[1].is_top_10, item[1].name))
    return [place for _, place in candidates]


def choose_next_place(
    candidates: list[Place],
    constraints: ItineraryConstraints,
    current_coordinates: tuple[float, float],
    used_ids: set[str],
    day_stops: list[Place],
    boosted_ids: set[str],
) -> Place | None:
    best_score = None
    best_place = None

    for place in candidates:
        if place.id in used_ids:
            continue
        if day_stops and place.municipality != day_stops[-1].municipality:
            distance = calculate_distance(day_stops[-1].coordinates, place.coordinates)
            if "far" in constraints.avoids and distance > 18:
                continue
            if distance > 45:
                continue

        leg_km = calculate_distance(current_coordinates, place.coordinates)
        score = candidate_base_score(place, constraints, boosted_ids)
        score -= min(leg_km, 60) / 8
        if day_stops and place.municipality == day_stops[-1].municipality:
            score += 2.5
        if constraints.categories and place.category in constraints.categories:
            score += 2

        if best_score is None or score > best_score:
            best_score = score
            best_place = place

    return best_place


def is_itinerary_place(place: Place, constraints: ItineraryConstraints) -> bool:
    if place.category in {"transport", "shopping"}:
        return False
    if place.category == "accommodation" and "accommodation" not in constraints.categories:
        return False
    if constraints.categories and place.category not in constraints.categories and place.category_group not in constraints.categories:
        return False
    if not constraints.categories and place.category not in DEFAULT_TOURISM_CATEGORIES:
        return False
    if constraints.budget and BUDGET_ORDER.get(place.min_budget, 0) > BUDGET_ORDER.get(constraints.budget, 0):
        return False
    if "hiking" in constraints.avoids and place.category in {"hike", "nature"}:
        return False
    if "rain_sensitive" in constraints.avoids and place.category in {"hike", "falls"}:
        return False
    if "expensive" in constraints.avoids and place.min_budget == "high":
        return False
    return True


def candidate_base_score(place: Place, constraints: ItineraryConstraints, boosted_ids: set[str]) -> float:
    score = 0.0
    if place.id in boosted_ids:
        score += 7
    if place.is_top_10:
        score += 5
    if constraints.categories and place.category in constraints.categories:
        score += 4
    if constraints.categories and place.category_group in constraints.categories:
        score += 2
    if constraints.budget and place.min_budget == "low":
        score += 1.5
    if place.visit_time_minutes <= 0:
        score -= 3
    if place.best_time_of_day == "morning":
        score += 0.5
    score -= BUDGET_ORDER.get(place.min_budget, 0) * 0.25
    return score


def estimate_travel_minutes(start: tuple[float, float], end: tuple[float, float]) -> tuple[int, str]:
    cached = build_cached_route_response([start, end])
    if cached:
        return max(1, int(round(cached.get("duration_min") or 0))), str(cached.get("source") or "local-road-router")

    distance_km = calculate_distance(start, end)
    return max(5, int(round((distance_km / 28) * 60))), "estimate"


def place_to_action_location(place: Place) -> dict[str, Any]:
    return {
        "id": place.id,
        "name": place.name,
        "description": place.description,
        "municipality": place.municipality,
        "type": place.type,
        "category": place.category,
        "category_group": place.category_group,
        "categoryGroup": place.category_group,
        "displayCategory": place.category_group,
        "coordinates": [place.coordinates[0], place.coordinates[1]],
        "geometry": {"type": "Point", "coordinates": [place.coordinates[0], place.coordinates[1]]},
        "image": place.image,
        "min_budget": place.min_budget,
        "best_time_of_day": place.best_time_of_day,
        "outdoor_exposure": place.outdoor_exposure,
        "visit_time_minutes": place.visit_time_minutes,
        "is_top_10": place.is_top_10,
        "isTop10": place.is_top_10,
    }


def parse_day_count(text: str, fallback: Any) -> int:
    number_match = re.search(r"\b([1-7])\s*(?:day|days)\b", text)
    if number_match:
        return clamp_day_count(number_match.group(1))

    words = {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
    }
    for word, value in words.items():
        if f"{word} day" in text or f"{word} days" in text:
            return value

    return clamp_day_count(fallback)


def parse_target_day(question: str, *, fallback: int) -> int:
    text = normalize_text(question)
    match = re.search(r"\bday\s*([1-7])\b", text)
    if match:
        return clamp_day_count(match.group(1))
    return int(fallback)


def parse_start_point(text: str, fallback: Any) -> str:
    if "san andres" in text:
        return "San Andres"
    if "virac" in text:
        return "Virac"
    fallback_text = normalize_text(fallback)
    if "san andres" in fallback_text:
        return "San Andres"
    return "Virac"


def parse_pace(text: str, fallback: str) -> str:
    if "relaxed" in text or "slow" in text or "easy" in text:
        return "relaxed"
    if "packed" in text or "full" in text or "many" in text:
        return "packed"
    if fallback in PACE_STOPS:
        return fallback
    return "balanced"


def parse_avoids(text: str) -> set[str]:
    avoids: set[str] = set()
    if "avoid hiking" in text or "no hiking" in text or "without hiking" in text:
        avoids.add("hiking")
    if "rain" in text or "rainy" in text or "weather" in text:
        avoids.add("rain_sensitive")
    if "avoid expensive" in text or "not expensive" in text or "no expensive" in text:
        avoids.add("expensive")
    if "avoid far" in text or "not far" in text or "nearby" in text:
        avoids.add("far")
    return avoids


def is_place_in_day(current_itinerary: Any, place_id: str, day: int) -> bool:
    if not isinstance(current_itinerary, dict):
        return False
    stops = current_itinerary.get(str(day)) or current_itinerary.get(day) or []
    if not isinstance(stops, list):
        return False
    return any(str(stop.get("id")) == str(place_id) for stop in stops if isinstance(stop, dict))


def clamp_day_count(value: Any) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        number = 2
    return max(1, min(MAX_DAY_COUNT, number))


def is_itinerary_request(text: str, memory: DialogueMemory) -> bool:
    if any(word in text for word in ITINERARY_WORDS):
        return True
    return "make it cheaper" in text and bool(memory.preferences.get("last_itinerary_constraints"))
