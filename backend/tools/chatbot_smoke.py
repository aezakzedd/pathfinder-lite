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


def main() -> None:
    assert_intent(ask("hello", session_id="smoke-hello"), "greeting")

    beaches = ask("best beaches", session_id="smoke-beaches")
    assert_intent(beaches, "recommendation")
    assert beaches["locations"], beaches

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
