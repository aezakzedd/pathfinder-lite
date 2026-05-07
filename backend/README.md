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

Returns local road-network geometry in `[lng, lat]` order:

```json
{
  "geometry": [[124.23, 13.58], [124.28, 13.61]],
  "distance_km": 8.4,
  "duration_min": 18,
  "source": "local-road-router"
}
```

This is intentionally lightweight. It uses a local road corridor graph now and can later be swapped behind the same contract for precomputed route GeoJSON, local OSRM, Valhalla, or GraphHopper.
