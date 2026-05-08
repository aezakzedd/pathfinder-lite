# Pathfinder Lite Backend

Small local-first API service for kiosk features that should not live in the frontend bundle.

## Run Locally

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

The frontend reads `VITE_API_URL` and falls back to `http://localhost:8000`.

## Route Endpoint

`POST /api/route`

```json
{
  "waypoints": [[124.23, 13.58], [124.28, 13.61]]
}
```

Returns precomputed local road-network geometry in `[lng, lat]` order:

```json
{
  "geometry": [[124.23, 13.58], [124.28, 13.61]],
  "distance_km": 8.4,
  "duration_min": 18,
  "source": "local-road-router"
}
```

This is intentionally lightweight. It uses a local road corridor graph now and can later be swapped behind the same contract for precomputed route GeoJSON, local OSRM, Valhalla, or GraphHopper.

## Route Cache

Runtime routing uses `backend/data/route_cache.sqlite`. The cache is intentionally small and backend-only:

- hub-to-destination routes for Virac and San Andres
- nearest-neighbor destination routes for normal itinerary legs
- compressed geometry blobs so the API can serve routes with simple SQLite lookups

Regenerate it from the original local road GeoJSON:

```bash
python -m backend.tools.build_route_cache --nearest 18
```

The generator looks for `backend/data/catanduanes_optimized.json` first, then the old Pathfinder reference copy at `../src/frontend/data/catanduanes_optimized.json`. The source road JSON is not needed at runtime.

## Chatbot Endpoint

`POST /ask`

```json
{
  "question": "best beaches",
  "active_pin": {
    "id": "13",
    "name": "Binurong Point",
    "category": "hike",
    "municipality": "Baras",
    "coordinates": [124.379584, 13.641908]
  },
  "session_id": "kiosk"
}
```

Returns a deterministic local response:

```json
{
  "answer": "Good local picks are: Mamangal Beach, Puraran Beach...",
  "locations": [{ "id": "15", "name": "Mamangal Beach" }],
  "follow_up": "Ask 'tell me more', 'another one', or 'nearby food'.",
  "actions": [],
  "intent": "recommendation",
  "source": "local-chatbot"
}
```

Supported intents:

- `greeting`
- `faq`
- `place_info`
- `recommendation`
- `itinerary_request`
- `add_to_day`
- `remove_place`
- `replace_place`
- `clear_itinerary_suggestion`
- `nearby_question`
- `budget_question`
- `route_question`
- `fallback`

The chatbot is offline-capable and uses `public/data/catanduanes_datafile.geojson`. It does not use an online LLM, embeddings, vector databases, or external APIs.

### Chatbot Data Files

The GeoJSON remains the base source of truth for places. Small JSON seed files under `backend/data/chatbot/` enrich the deterministic chatbot without adding runtime-heavy AI components:

- `aliases.json` maps common user wording, such as `Binurong`, `Twin Rock`, `Bato Church`, `Puraran`, `Mamangal`, `Maribina`, `Balacay`, `Virac Airport`, and `Virac Port`, to local place records.
- `place_facts.json` adds concise structured facts for important places: best time, accessibility, travel tips, budget notes, family notes, visit duration, and cautions.
- `faqs.json` stores general Catanduanes tourism answers for weather, budget, transport, safety, beaches, viewpoints, food, rainy days, family-friendly picks, and what to bring.
- `recommendation_rules.json` ranks local recommendations for beaches, viewpoints, food, heritage, budget-friendly stops, family-friendly stops, low-walking stops, and outdoor/nature stops.

Example enriched ask:

```json
{
  "question": "is Binurong hard to access?"
}
```

Example response:

```json
{
  "answer": "Binurong Point is a outdoor stop in Baras. ... Requires an uphill walk on grass and uneven ground. Wear comfortable footwear, bring water, and start early.",
  "locations": [{ "id": "13", "name": "Binurong Point" }],
  "follow_up": "Ask for nearby food, another option, or add it.",
  "actions": [],
  "intent": "place_info",
  "source": "local-chatbot"
}
```

Run smoke checks:

```bash
python -m backend.tools.chatbot_smoke
```

### Itinerary Actions

The deterministic chatbot can prepare itinerary edits, but the frontend must confirm before applying them. It never silently overwrites the itinerary.

Example request:

```json
{
  "question": "generate a 2 day beach itinerary",
  "session_id": "kiosk",
  "preferences": {
    "startPoint": "Virac",
    "budget": "low",
    "activities": ["Water"],
    "dayCount": 2
  }
}
```

Example response shape:

```json
{
  "answer": "I made a 2-day beach itinerary from Virac. Review it in the itinerary card, then adjust stops if needed.",
  "locations": [{ "id": "15", "name": "Mamangal Beach" }],
  "actions": [
    {
      "type": "replace_itinerary",
      "days": {
        "1": [{ "id": "15", "name": "Mamangal Beach" }],
        "2": [{ "id": "13", "name": "Binurong Point" }]
      },
      "summary": {
        "day_count": 2,
        "start_point": "Virac",
        "pace": "balanced",
        "budget": "low",
        "estimated_total_minutes": 420
      }
    }
  ],
  "intent": "itinerary_request",
  "source": "local-chatbot"
}
```

Supported itinerary commands include:

- `generate a 2 day beach itinerary`
- `make me a budget itinerary`
- `plan 3 days from Virac with beaches and viewpoints`
- `make it cheaper`
- `add this to day 2`
- `remove this place`
- `replace it with another beach`
- `clear itinerary`

## PDF Generation Endpoint

`POST /api/pdf/generate`

Generate a PDF itinerary from the frontend export payload:

```json
{
  "days": {
    "1": [
      {
        "id": "1",
        "name": "Puraran Beach",
        "municipality": "Baras",
        "category": "Beach",
        "time": "9:00 AM",
        "duration": "2-3 hours",
        "driveTime": 45
      }
    ],
    "2": [
      {
        "id": "2",
        "name": "Twin Rock Beach Resort",
        "municipality": "Virac",
        "category": "Beach",
        "time": "10:00 AM",
        "duration": "3-4 hours",
        "driveTime": 30
      }
    ]
  },
  "totalStops": 2,
  "dayCount": 2,
  "dateRange": {
    "startDate": "2025-06-01",
    "endDate": "2025-06-02"
  },
  "timeWallet": {
    "pace": "Moderate"
  },
  "setup": {
    "startPoint": "Virac",
    "tripDate": "2025-06-01",
    "tripEndDate": "2025-06-02",
    "activities": ["Beach"],
    "budget": "medium"
  },
  "routeSource": "local-road-router"
}
```

Returns PDF ID and download URL:

```json
{
  "pdf_id": "f0ccc287-dbb6-4111-995f-12e4a49f325e",
  "download_url": "/api/pdf/f0ccc287-dbb6-4111-995f-12e4a49f325e.pdf"
}
```

### PDF Download

`GET /api/pdf/{pdf_id}.pdf`

Download the generated PDF file. Returns binary PDF content with `Content-Type: application/pdf` and `Content-Disposition: attachment`.

### PDF Deletion

`DELETE /api/pdf/{pdf_id}`

Delete a generated PDF from storage:

```json
{
  "message": "PDF deleted successfully"
}
```

### PDF Storage

Generated PDFs are stored in `backend/data/generated_pdfs/`. This directory is gitignored. The PDF generator uses fpdf2 for lightweight backend PDF generation without increasing the frontend bundle.

Run smoke test:

```bash
python -m backend.tools.pdf_smoke
```

## Session Finish Endpoint

`POST /api/session/finish`

Clean up kiosk session data after a tourist finishes their trip:

```json
{
  "pdf_id": "f0ccc287-dbb6-4111-995f-12e4a49f325e",
  "session_id": "kiosk"
}
```

Both fields are optional. The endpoint will:

- Delete the generated PDF if `pdf_id` is provided
- Clear chatbot dialogue memory for the session if `session_id` is provided
- Return status of cleanup operations

Returns:

```json
{
  "ok": true,
  "deleted_pdf": true,
  "cleared_session": true
}
```

The endpoint is safe if:
- `pdf_id` is missing
- PDF is already deleted
- `pdf_id` is invalid
- `session_id` is not found in dialogue store

The endpoint does NOT delete:
- Route cache
- Chatbot data files
- Tourism/GeoJSON data
- Application files

This ensures the next kiosk user starts with a clean session without affecting shared resources.
