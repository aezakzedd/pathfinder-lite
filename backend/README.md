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
- `place_info`
- `recommendation`
- `itinerary_request`
- `nearby_question`
- `budget_question`
- `route_question`
- `fallback`

The chatbot is offline-capable and uses `public/data/catanduanes_datafile.geojson`. It does not use an online LLM, embeddings, vector databases, or external APIs.

Run smoke checks:

```bash
python -m backend.tools.chatbot_smoke
```
