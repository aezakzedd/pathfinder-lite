from __future__ import annotations

from typing import Any

from .dialogue_state import DialogueMemory, dialogue_store
from .knowledge_base import (
    Place,
    calculate_distance,
    get_knowledge_base,
    infer_budget,
    infer_categories,
    normalize_budget,
    normalize_text,
)


SOURCE = "local-chatbot"


def answer_question(
    question: str,
    *,
    active_pin: dict[str, Any] | None = None,
    session_id: str | None = None,
    preferences: dict[str, Any] | None = None,
) -> dict[str, Any]:
    kb = get_knowledge_base()
    memory = dialogue_store.get(session_id)
    apply_preferences(memory, preferences)

    text = normalize_text(question)
    active_place = kb.resolve_active_pin(active_pin)
    intent = detect_intent(text, active_place, memory)

    if active_place and is_contextual_place_question(text):
        memory.active_place_id = active_place.id

    if intent == "greeting":
        return respond(
            "Hi, I can help with Catanduanes places, nearby spots, budget picks, and simple itinerary ideas.",
            intent=intent,
            follow_up="Ask for a place or a recommendation.",
            memory=memory,
        )

    if intent == "place_info":
        place = resolve_place_for_question(kb, question, active_pin, memory)
        if not place:
            return fallback_response(memory, "Which place in Catanduanes should I describe?")
        return place_info_response(place, memory, concise=False)

    if intent == "followup_more":
        place = resolve_context_place(kb, active_pin, memory)
        if not place:
            return fallback_response(memory, "Which place do you want to know more about?")
        return place_info_response(place, memory, concise=False)

    if intent == "add_it":
        place = resolve_context_place(kb, active_pin, memory)
        if not place:
            return fallback_response(memory, "Select a map pin first, then I can mark it for adding.")
        return respond(
            f"Sure. I marked {place.name} as the place to add. Use the Add Spot button to place it in your day.",
            locations=[place],
            actions=[{"type": "add_to_trip", "location": place.to_location()}],
            intent=intent,
            memory=memory,
            active_place=place,
        )

    if intent == "nearby_question":
        origin = resolve_context_place(kb, active_pin, memory)
        if not origin:
            return fallback_response(memory, "Select a place first so I can find nearby options.")
        categories = infer_categories(text, None)
        nearby_places = kb.nearby(origin, query=question, categories=categories, limit=4)
        return recommendation_response(
            nearby_places,
            memory,
            intent=intent,
            prefix=f"Near {origin.name}, I found",
            empty="I could not find nearby matches in the local place data.",
        )

    if intent == "budget_question":
        memory.preferences["budget"] = "low"
        places = kb.recommend(
            question,
            active_pin=active_pin,
            budget="low",
            activities=memory.preferences.get("activities"),
            limit=4,
        )
        return recommendation_response(
            places,
            memory,
            intent=intent,
            prefix="For a budget-friendly plan, try",
            empty="I could not find low-budget matches in the local place data.",
        )

    if intent == "recommendation":
        exclude_ids = set()
        categories = infer_categories(text, memory.preferences.get("activities"))
        if "another" in text:
            exclude_ids.update(memory.last_recommended_place_ids)
            categories = set(memory.preferences.get("last_recommendation_categories") or categories)
        places = kb.recommend(
            question,
            active_pin=active_pin,
            budget=infer_budget(text) or memory.preferences.get("budget"),
            activities=memory.preferences.get("activities"),
            categories=categories,
            limit=4,
            exclude_ids=exclude_ids,
        )
        memory.preferences["last_recommendation_categories"] = sorted(categories)
        return recommendation_response(
            places,
            memory,
            intent=intent,
            prefix="Good local picks are",
            empty="I could not find a strong match. Try asking for beaches, food, heritage, views, or budget spots.",
        )

    if intent == "itinerary_request":
        places = kb.recommend(
            question,
            active_pin=active_pin,
            budget=memory.preferences.get("budget"),
            activities=memory.preferences.get("activities"),
            limit=5,
        )
        return recommendation_response(
            places,
            memory,
            intent=intent,
            prefix="For an itinerary start, I would shortlist",
            actions=[{"type": "itinerary_suggestion", "day_count": memory.preferences.get("day_count")}],
            empty="I need at least an activity or budget preference to suggest a useful itinerary.",
        )

    if intent == "route_question":
        place = resolve_context_place(kb, active_pin, memory)
        if place:
            return respond(
                f"{place.name} can be routed on the map after it is selected or added. The route line uses the local offline road cache when available.",
                locations=[place],
                intent=intent,
                memory=memory,
                active_place=place,
            )
        return respond(
            "Routes are handled locally. Select or add destinations and Pathfinder will draw the offline road-following route when cached.",
            intent=intent,
            memory=memory,
        )

    return fallback_response(memory, "I can help with places, nearby food, budget picks, routes, or simple itinerary ideas.")


def detect_intent(text: str, active_place: Place | None, memory: DialogueMemory) -> str:
    if not text:
        return "fallback"
    if any(word in text.split() for word in ("hi", "hello", "hey")) or text in {"good morning", "good afternoon"}:
        return "greeting"
    if text in {"tell me more", "more", "details"} or "tell me more" in text:
        return "followup_more"
    if text in {"add it", "add this", "add this place"} or "add it" in text:
        return "add_it"
    if "nearby" in text or "near me" in text or "close to" in text:
        return "nearby_question"
    if any(phrase in text for phrase in ("make it cheaper", "cheap", "cheaper", "budget friendly", "affordable", "low budget")):
        return "budget_question"
    if any(word in text for word in ("route", "drive", "road", "how far", "distance", "travel time")):
        return "route_question"
    if any(word in text for word in ("itinerary", "plan", "day trip", "schedule")):
        return "itinerary_request"
    if "another" in text and memory.last_recommended_place_ids:
        return "recommendation"
    if any(word in text for word in ("recommend", "best", "where", "places", "spots", "beach", "falls", "food", "stay", "hotel", "view", "church")):
        return "recommendation"
    if active_place and is_contextual_place_question(text):
        return "place_info"
    return "place_info"


def resolve_place_for_question(kb, question: str, active_pin: dict[str, Any] | None, memory: DialogueMemory) -> Place | None:
    if is_contextual_place_question(normalize_text(question)):
        return resolve_context_place(kb, active_pin, memory)
    return kb.match_place(question, active_pin=active_pin) or resolve_context_place(kb, active_pin, memory)


def resolve_context_place(kb, active_pin: dict[str, Any] | None, memory: DialogueMemory) -> Place | None:
    active_place = kb.resolve_active_pin(active_pin)
    if active_place:
        return active_place
    if memory.active_place_id:
        return kb.by_id.get(memory.active_place_id)
    if memory.last_recommended_place_ids:
        return kb.by_id.get(memory.last_recommended_place_ids[0])
    return None


def place_info_response(place: Place, memory: DialogueMemory, *, concise: bool) -> dict[str, Any]:
    details = []
    if place.municipality:
        details.append(place.municipality)
    details.append(place.category_group)
    details.append(format_budget(place.min_budget))
    if place.best_time_of_day and place.best_time_of_day != "any":
        details.append(f"best {place.best_time_of_day}")

    description = place.description or "The local data has basic map details for this place, but no long description yet."
    if concise and len(description) > 120:
        description = f"{description[:117].rstrip()}..."

    answer = f"{place.name}: {description} ({', '.join(details)}.)"
    return respond(
        answer,
        locations=[place],
        intent="place_info",
        follow_up="Ask for nearby food, another option, or add it.",
        memory=memory,
        active_place=place,
    )


def recommendation_response(
    places: list[Place],
    memory: DialogueMemory,
    *,
    intent: str,
    prefix: str,
    empty: str,
    actions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not places:
        return fallback_response(memory, empty, intent=intent)

    names = ", ".join(place.name for place in places[:4])
    answer = f"{prefix}: {names}. I selected {places[0].name} on the map."
    return respond(
        answer,
        locations=places,
        actions=actions or [],
        intent=intent,
        follow_up="Ask 'tell me more', 'another one', or 'nearby food'.",
        memory=memory,
        active_place=places[0],
        recommended_places=places,
    )


def fallback_response(memory: DialogueMemory, message: str, *, intent: str = "fallback") -> dict[str, Any]:
    return respond(
        message,
        intent=intent,
        follow_up="Try asking for beaches, food, budget places, or a specific destination.",
        memory=memory,
    )


def respond(
    answer: str,
    *,
    intent: str,
    memory: DialogueMemory,
    locations: list[Place] | None = None,
    follow_up: str | None = None,
    actions: list[dict[str, Any]] | None = None,
    active_place: Place | None = None,
    recommended_places: list[Place] | None = None,
) -> dict[str, Any]:
    memory.last_intent = intent
    memory.pending_followup = follow_up
    if active_place:
        memory.active_place_id = active_place.id
    if recommended_places is not None:
        memory.last_recommended_place_ids = [place.id for place in recommended_places]

    return {
        "answer": answer,
        "locations": [place.to_location() for place in (locations or [])],
        "follow_up": follow_up,
        "actions": actions or [],
        "intent": intent,
        "source": SOURCE,
    }


def apply_preferences(memory: DialogueMemory, preferences: dict[str, Any] | None) -> None:
    if not preferences:
        return
    if preferences.get("budget"):
        memory.preferences["budget"] = normalize_budget(preferences.get("budget"))
    if isinstance(preferences.get("activities"), list):
        memory.preferences["activities"] = [str(activity) for activity in preferences["activities"]]
    if preferences.get("startPoint"):
        memory.preferences["start_point"] = str(preferences.get("startPoint"))
    if preferences.get("dayCount"):
        memory.preferences["day_count"] = preferences.get("dayCount")


def is_contextual_place_question(text: str) -> bool:
    tokens = set(text.split())
    return (
        "this place" in text
        or "this spot" in text
        or "selected place" in text
        or "here" in tokens
        or "this" in tokens
        or "it" in tokens
    )


def format_budget(value: str) -> str:
    if value == "high":
        return "PHP600+"
    if value == "medium":
        return "PHP200-PHP600"
    return "budget-friendly"
