from __future__ import annotations

import re
from typing import Any

from .dialogue_state import DialogueMemory, dialogue_store
from .knowledge_base import (
    Place,
    categories_from_rules,
    calculate_distance,
    get_knowledge_base,
    infer_budget,
    infer_categories,
    normalize_budget,
    normalize_text,
    score_place,
    tokenize,
)
from .itinerary_planner import (
    build_add_to_day_action,
    build_clear_itinerary_suggestion,
    build_itinerary_plan,
    build_remove_place_action,
    build_replace_itinerary_action,
    build_replace_place_action,
    is_itinerary_request,
)


SOURCE = "local-chatbot"


# Count-parsing word map
_WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


def parse_count(user_input: str) -> tuple[int, bool]:
    """Extract explicit count from query. Returns (count, is_explicit)."""
    query_lower = user_input.lower()
    digit_match = re.search(r"\b(top|best|give me|show me)?\s*(\d+)\b", query_lower)
    if digit_match:
        n = int(digit_match.group(2))
        if 1 <= n <= 50:
            return n, True
    for word, num in _WORD_NUMBERS.items():
        pattern = r"\b(top|best|give me|show me)?\s*" + word + r"\b"
        if re.search(pattern, query_lower):
            return num, True
    return 5, False


# ---------------------------------------------------------------------------
# Confidence tier helpers
# ---------------------------------------------------------------------------
T1_THRESHOLD = 0.72
T2_THRESHOLD = 0.60


def _score_to_confidence(score: float, max_score: float = 100.0) -> float:
    """Normalize a raw KB score to a 0-1 confidence value."""
    if max_score <= 0:
        return 0.0
    return min(1.0, score / max_score)


def apply_confidence_framing(answer: str, confidence: float, is_list: bool = False) -> str:
    """Wrap answer with T1/T2/T3 framing. Lists are never modified."""
    if is_list:
        return answer
    if not answer:
        return answer
    lower = answer.lower()
    if "i don't have information" in lower or "i'm sorry" in lower and "don't have" in lower:
        return answer

    if confidence >= T1_THRESHOLD:
        return answer  # authoritative — as-is
    if confidence >= T2_THRESHOLD:
        # qualified — add prefix
        if "price" in lower or "cost" in lower or "fee" in lower or "budget" in lower:
            return "Based on available records, " + answer + " Prices may change; please verify with the site before visiting."
        return "Based on available records, " + answer
    # T3 — weak confidence
    return (
        "I'm not certain about that. " + answer +
        " For the latest details, please contact the Catanduanes Provincial Tourism Office."
    )


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
    matched_faq = kb.match_faq(question)
    intent = detect_intent(text, active_place, memory, matched_faq)
    requested_count, _ = parse_count(question)

    if active_place and is_contextual_place_question(text):
        memory.active_place_id = active_place.id

    if intent == "greeting":
        return respond(
            "Hi, I can help with Catanduanes places, nearby spots, budget picks, and simple itinerary ideas.",
            intent=intent,
            follow_up="Ask for a place or a recommendation.",
            memory=memory,
        )

    if intent == "faq":
        return respond(
            matched_faq["answer"],
            intent=intent,
            follow_up="Ask for a specific place or a recommendation if you want map picks.",
            memory=memory,
        )

    if intent == "place_info":
        place = resolve_place_for_question(kb, question, active_pin, memory)
        if not place:
            return place_suggestion_response(kb, question, memory, count=requested_count)
        return place_info_response(place, memory, question, concise=False)

    if intent == "followup_more":
        place = resolve_context_place(kb, active_pin, memory)
        if not place:
            return fallback_response(memory, "Which place do you want to know more about?")
        return place_info_response(place, memory, question, concise=False)

    if intent == "add_to_day":
        result = build_add_to_day_action(kb, question, active_pin=active_pin, memory=memory)
        locations = result.get("locations") or []
        active_location = locations[0] if locations else None
        return respond(
            result["answer"],
            locations=locations,
            actions=result.get("actions") or [],
            intent=intent,
            follow_up="Confirm the action in chat, or ask for another change.",
            memory=memory,
            active_place=active_location,
            recommended_places=locations,
        )

    if intent == "replace_place":
        result = build_replace_place_action(kb, question, active_pin=active_pin, memory=memory)
        locations = result.get("locations") or []
        active_location = locations[0] if locations else None
        return respond(
            result["answer"],
            locations=locations,
            actions=result.get("actions") or [],
            intent=intent,
            follow_up="Confirm the replacement in chat, or ask for another option.",
            memory=memory,
            active_place=active_location,
            recommended_places=locations,
        )

    if intent == "remove_place":
        result = build_remove_place_action(kb, question, active_pin=active_pin, memory=memory)
        locations = result.get("locations") or []
        active_location = locations[0] if locations else None
        return respond(
            result["answer"],
            locations=locations,
            actions=result.get("actions") or [],
            intent=intent,
            follow_up="Confirm the removal in chat if that is correct.",
            memory=memory,
            active_place=active_location,
            recommended_places=locations,
        )

    if intent == "clear_itinerary_suggestion":
        result = build_clear_itinerary_suggestion()
        return respond(
            result["answer"],
            actions=result["actions"],
            intent=intent,
            follow_up="Confirm Clear Plan if you want to start over.",
            memory=memory,
        )

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
        nearby_places = kb.nearby(origin, query=question, categories=categories, limit=requested_count)
        return recommendation_response(
            nearby_places,
            memory,
            question,
            intent=intent,
            prefix=f"Near {origin.name}, I found",
            empty="I could not find nearby matches in the local place data.",
        )

    if intent == "budget_question":
        memory.preferences["budget"] = "low"
        rule_categories = categories_from_rules(kb.match_recommendation_rules(text))
        categories = infer_categories(text, memory.preferences.get("activities")) or rule_categories
        if not categories and "make it cheaper" in text:
            categories = set(memory.preferences.get("last_recommendation_categories") or [])
        places = kb.recommend(
            question,
            active_pin=active_pin,
            budget="low",
            activities=memory.preferences.get("activities"),
            categories=categories,
            limit=requested_count,
        )
        if categories:
            memory.preferences["last_recommendation_categories"] = sorted(categories)
        return recommendation_response(
            places,
            memory,
            question,
            intent=intent,
            prefix="For a budget-friendly plan, try",
            empty="I could not find low-budget matches in the local place data.",
        )

    if intent == "recommendation":
        exclude_ids = set()
        categories = infer_categories(text, memory.preferences.get("activities"))
        if not categories:
            categories = categories_from_rules(kb.match_recommendation_rules(text))
        if is_unclear_recommendation(text, categories, memory):
            return fallback_response(
                memory,
                "What kind of place should I look for: beaches, viewpoints, food, heritage, outdoor spots, or budget-friendly stops?",
                intent=intent,
            )
        if "another" in text:
            exclude_ids.update(memory.last_recommended_place_ids)
            categories = set(memory.preferences.get("last_recommendation_categories") or categories)
        places = kb.recommend(
            question,
            active_pin=active_pin,
            budget=infer_budget(text) or memory.preferences.get("budget"),
            activities=memory.preferences.get("activities"),
            categories=categories,
            limit=requested_count,
            exclude_ids=exclude_ids,
        )
        if categories:
            memory.preferences["last_recommendation_categories"] = sorted(categories)
        return recommendation_response(
            places,
            memory,
            question,
            intent=intent,
            prefix="Good local picks are",
            empty="I could not find a strong match. Try asking for beaches, food, heritage, views, or budget spots.",
        )

    if intent == "itinerary_request":
        plan = build_itinerary_plan(kb, question, active_pin=active_pin, memory=memory)
        memory.preferences["last_itinerary_constraints"] = {
            "day_count": plan.summary["day_count"],
            "start_point": plan.summary["start_point"],
            "categories": plan.summary.get("categories", []),
            "budget": plan.summary.get("budget"),
            "pace": plan.summary.get("pace"),
            "avoids": plan.summary.get("avoids", []),
        }
        memory.preferences["last_itinerary_days"] = plan.days
        if not plan.places:
            return fallback_response(
                memory,
                "I could not build a useful local itinerary from those constraints. Try beaches, viewpoints, heritage, or budget-friendly stops.",
                intent=intent,
            )
        category_label = summarize_plan_categories(plan.summary.get("categories", []))
        budget_label = "budget " if plan.summary.get("budget") == "low" else ""
        answer = (
            f"I made a {plan.summary['day_count']}-day {budget_label}{category_label}itinerary from {plan.summary['start_point']}. "
            "Review it in the itinerary card, then adjust stops if needed."
        )
        return respond(
            answer,
            locations=plan.places,
            actions=[build_replace_itinerary_action(plan)],
            intent=intent,
            follow_up="Tap Apply Plan to replace the current itinerary, or ask me to make it cheaper.",
            memory=memory,
            active_place=plan.places[0],
            recommended_places=plan.places,
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


def detect_intent(text: str, active_place: Place | None, memory: DialogueMemory, matched_faq: dict[str, Any] | None = None) -> str:
    if not text:
        return "fallback"
    if any(word in text.split() for word in ("hi", "hello", "hey")) or text in {"good morning", "good afternoon"}:
        return "greeting"
    if matched_faq and should_prefer_faq(text, matched_faq):
        return "faq"
    if text in {"tell me more", "more", "details"} or "tell me more" in text:
        return "followup_more"
    if "clear" in text and any(word in text for word in ("itinerary", "plan", "schedule")):
        return "clear_itinerary_suggestion"
    if "replace" in text and any(word in text for word in ("it", "this", "stop", "place", "beach", "view", "food")):
        return "replace_place"
    if any(word in text for word in ("remove", "delete")) and any(word in text for word in ("it", "this", "stop", "place", "day")):
        return "remove_place"
    if "add" in text and "day" in text:
        return "add_to_day"
    if text in {"add it", "add this", "add this place"} or "add it" in text:
        return "add_it"
    if "nearby" in text or "near me" in text or "close to" in text:
        return "nearby_question"
    if is_itinerary_request(text, memory):
        return "itinerary_request"
    if any(word in text for word in ("route", "drive", "road", "how far", "distance", "travel time")):
        return "route_question"
    if any(phrase in text for phrase in ("make it cheaper", "cheap", "cheaper", "budget", "budget friendly", "affordable", "low budget")):
        return "budget_question"
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


def place_info_response(place: Place, memory: DialogueMemory, question: str, *, concise: bool) -> dict[str, Any]:
    description = summarize_place_intro(place)
    facts = place.facts or {}
    fact_parts = []
    for key in ("best_time", "accessibility", "travel_tip", "budget_note", "family_note", "visit_duration_note", "caution_note"):
        if facts.get(key):
            fact_parts.append(str(facts[key]))

    fact_parts = fact_parts[:2] if concise else fact_parts[:3]

    answer = " ".join([description, *fact_parts]).strip()
    confidence = _place_confidence(place, question)
    answer = apply_confidence_framing(answer, confidence, is_list=False)
    return respond(
        answer,
        locations=[place],
        intent="place_info",
        follow_up="Ask for nearby food, another option, or add it.",
        memory=memory,
        active_place=place,
        confidence=confidence,
    )


def summarize_place_intro(place: Place) -> str:
    category = place.category_group.lower()
    municipality = f" in {place.municipality}" if place.municipality else ""
    description = place.description.strip()
    if description:
        return f"{place.name} is a {category} stop{municipality}. {description}"
    return f"{place.name} is a {category} stop{municipality}."


def recommendation_response(
    places: list[Place],
    memory: DialogueMemory,
    question: str,
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
    confidence = _place_confidence(places[0], question) if places else 0.0
    return respond(
        answer,
        locations=places,
        actions=actions or [],
        intent=intent,
        follow_up="Ask 'tell me more', 'another one', or 'nearby food'.",
        memory=memory,
        active_place=places[0],
        recommended_places=places,
        confidence=confidence,
    )


def fallback_response(memory: DialogueMemory, message: str, *, intent: str = "fallback") -> dict[str, Any]:
    return respond(
        message,
        intent=intent,
        follow_up="Try asking for beaches, food, budget places, or a specific destination.",
        memory=memory,
    )


def place_suggestion_response(kb, question: str, memory: DialogueMemory, *, count: int = 3) -> dict[str, Any]:
    suggestions = kb.suggest_places(question, limit=count)
    if suggestions:
        names = ", ".join(place.name for place in suggestions)
        return respond(
            f"I could not find an exact place match. Did you mean {names}?",
            locations=suggestions,
            intent="fallback",
            follow_up="Select one on the map, or ask using the full place name.",
            memory=memory,
            recommended_places=suggestions,
            confidence=0.4,
        )
    return fallback_response(memory, "Which place in Catanduanes should I describe?")


def summarize_plan_categories(categories: list[str]) -> str:
    category_set = set(categories or [])
    if category_set & {"beach", "beach_resort", "swimming"}:
        return "beach "
    if category_set & {"viewpoint"}:
        return "viewpoint "
    if category_set & {"food"}:
        return "food "
    if category_set & {"religious", "history", "culture", "indoor"}:
        return "heritage "
    if category_set & {"hike", "nature", "falls"}:
        return "outdoor "
    return ""


def is_unclear_recommendation(text: str, categories: set[str], memory: DialogueMemory) -> bool:
    if categories or infer_budget(text) or memory.preferences.get("activities"):
        return False
    vague_phrases = ("recommend", "where should", "where can", "best places", "places to go", "spots to visit")
    return any(phrase in text for phrase in vague_phrases)


def should_prefer_faq(text: str, matched_faq: dict[str, Any]) -> bool:
    faq_phrases = (
        "best time",
        "when to visit",
        "what to bring",
        "transport",
        "transportation",
        "safety",
        "safe",
        "rain",
        "rainy",
        "weather",
        "budget tips",
        "save money",
    )
    if any(phrase in text for phrase in faq_phrases):
        return True

    recommendation_words = ("recommend", "places", "spots", "where", "beaches", "viewpoints", "family")
    if any(word in text for word in recommendation_words):
        return False

    return bool(matched_faq)


def _place_confidence(place: Place, query: str) -> float:
    norm = normalize_text(query)
    tokens = set(tokenize(query))
    return _score_to_confidence(score_place(place, norm, tokens), 100.0)


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
    confidence: float = 1.0,
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
        "confidence": round(confidence, 2),
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
    if isinstance(preferences.get("currentItinerary"), dict):
        memory.preferences["current_itinerary"] = preferences.get("currentItinerary")


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
