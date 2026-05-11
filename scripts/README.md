# Scripts

## Dense Road Routing Setup

These scripts extract real road data from OpenStreetMap and pre-compute routes for all destinations.

### Prerequisites

- Python 3.10+
- `pip install osmium` (only needed on your dev PC, not on the Pi)

### Step 1: Download & clip the OSM data

```bash
# Download Philippines extract (~1GB, one-time)
wget https://download.geofabrik.de/asia/philippines-latest.osm.pbf

# Clip to Catanduanes bounding box (~small output)
osmium extract -b 124.0,13.5,124.5,14.1 philippines-latest.osm.pbf -o catanduanes.osm.pbf
```

### Step 2: Build the road graph

```bash
python scripts/build_road_graph.py catanduanes.osm.pbf
```

This produces `public/data/road_graph.json` (~2-3MB) containing:
- All drivable road intersections as graph nodes
- Road segments as edges with haversine distances
- Intermediate geometry for curved roads

### Step 3: Pre-compute the route cache

```bash
python scripts/build_route_cache.py
```

This computes shortest-path routes between **all** destination pairs (~14,000 routes) and stores them in `backend/data/route_cache.sqlite`.

### Step 4: Deploy to Pi

Copy these files to the Pi:
- `public/data/road_graph.json` (frontend fallback routing)
- `backend/data/route_cache.sqlite` (backend instant route lookups)

## RPi Global Back Button Extension

See `rpi-global-back-button-extension/README.md`.
