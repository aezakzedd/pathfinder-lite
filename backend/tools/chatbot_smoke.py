from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def ask(question: str, **payload):
    response = client.post("/ask", json={"question": question, **payload})
    response.raise_for_status()
    data = response.json()
    print(f"{question!r} -> {data['intent']}: {data['answer']}")
    return data


def assert_intent(data, intent: str):
    assert data["intent"] == intent, data
    assert data["source"] == "local-chatbot", data
    assert isinstance(data["locations"], list), data


def first_action(data, action_type: str):
    matches = [action for action in data.get("actions", []) if action.get("type") == action_type]
    assert matches, data
    return matches[0]


def main() -> None:
    assert_intent(ask("hello", session_id="smoke-hello"), "greeting")

    alias = ask("tell me about Binurong", session_id="smoke-alias")
    assert_intent(alias, "place_info")
    assert alias["locations"][0]["name"] == "Binurong Point", alias
    assert "morning" in alias["answer"].lower(), alias

    faq = ask("best time to visit Catanduanes", session_id="smoke-faq")
    assert_intent(faq, "faq")
    assert "dry" in faq["answer"].lower() or "march" in faq["answer"].lower(), faq

    access = ask("is Binurong hard to access?", session_id="smoke-access")
    assert_intent(access, "place_info")
    assert access["locations"][0]["name"] == "Binurong Point", access
    assert "walk" in access["answer"].lower() or "footwear" in access["answer"].lower(), access

    beaches = ask("best beaches", session_id="smoke-beaches")
    assert_intent(beaches, "recommendation")
    assert beaches["locations"], beaches

    budget_beaches = ask("budget beaches", session_id="smoke-budget-beaches")
    assert_intent(budget_beaches, "budget_question")
    assert budget_beaches["locations"], budget_beaches
    assert all(location["category"] in {"beach", "beach_resort", "swimming"} for location in budget_beaches["locations"]), budget_beaches

    family = ask("family-friendly places", session_id="smoke-family")
    assert_intent(family, "recommendation")
    assert family["locations"], family

    beach_plan = ask("generate a 2 day beach itinerary", session_id="smoke-itinerary-beach")
    assert_intent(beach_plan, "itinerary_request")
    beach_action = first_action(beach_plan, "replace_itinerary")
    assert beach_action["summary"]["day_count"] == 2, beach_action
    assert set(beach_action["days"].keys()) == {"1", "2"}, beach_action
    assert all(beach_action["days"][day] for day in ("1", "2")), beach_action

    budget_plan = ask("make me a budget itinerary", session_id="smoke-itinerary-budget")
    assert_intent(budget_plan, "itinerary_request")
    budget_action = first_action(budget_plan, "replace_itinerary")
    assert budget_action["summary"]["budget"] == "low", budget_action

    virac_plan = ask("plan 3 days from Virac with beaches and viewpoints", session_id="smoke-itinerary-virac")
    assert_intent(virac_plan, "itinerary_request")
    virac_action = first_action(virac_plan, "replace_itinerary")
    assert virac_action["summary"]["day_count"] == 3, virac_action
    assert virac_action["summary"]["start_point"] == "Virac", virac_action

    cheaper_plan = ask("make it cheaper", session_id="smoke-itinerary-virac")
    assert_intent(cheaper_plan, "itinerary_request")
    cheaper_action = first_action(cheaper_plan, "replace_itinerary")
    assert cheaper_action["summary"]["budget"] == "low", cheaper_action

    add_day = ask(
        "add this to day 2",
        session_id="smoke-add-day",
        active_pin={
            "id": "13",
            "name": "Binurong Point",
            "category": "hike",
            "municipality": "Baras",
            "coordinates": [124.379584, 13.641908],
        },
        preferences={"dayCount": 3},
    )
    assert_intent(add_day, "add_to_day")
    add_action = first_action(add_day, "add_to_day")
    assert add_action["day"] == 2, add_action
    assert add_action["location"]["name"] == "Binurong Point", add_action

    duplicate = ask(
        "add this to day 2",
        session_id="smoke-duplicate",
        active_pin={
            "id": "13",
            "name": "Binurong Point",
            "category": "hike",
            "municipality": "Baras",
            "coordinates": [124.379584, 13.641908],
        },
        preferences={
            "dayCount": 3,
            "currentItinerary": {"2": [{"id": "13", "name": "Binurong Point"}]},
        },
    )
    assert_intent(duplicate, "add_to_day")
    assert not duplicate["actions"], duplicate

    another = ask("another one", session_id="smoke-beaches")
    assert_intent(another, "recommendation")
    assert another["locations"], another
    assert another["locations"][0]["id"] != beaches["locations"][0]["id"], another

    binurong = ask("tell me about Binurong Point", session_id="smoke-place")
    assert_intent(binurong, "place_info")
    assert binurong["locations"][0]["name"] == "Binurong Point", binurong

    more = ask("tell me more", session_id="smoke-place")
    assert_intent(more, "place_info")
    assert more["locations"][0]["name"] == "Binurong Point", more

    nearby_food = ask("nearby food", session_id="smoke-place")
    assert_intent(nearby_food, "nearby_question")
    assert nearby_food["locations"], nearby_food

    budget = ask("budget-friendly places", session_id="smoke-budget")
    assert_intent(budget, "budget_question")
    assert budget["locations"], budget

    active = ask(
        "what about this place?",
        session_id="smoke-active-pin",
        active_pin={
            "id": "13",
            "name": "Binurong Point",
            "category": "hike",
            "municipality": "Baras",
            "coordinates": [124.379584, 13.641908],
        },
    )
    assert_intent(active, "place_info")
    assert active["locations"][0]["name"] == "Binurong Point", active

    print("chatbot smoke checks passed")


if __name__ == "__main__":
    main()
