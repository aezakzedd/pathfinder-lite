#!/usr/bin/env python3
"""
Pre-compute routes between all destination pairs and populate route_cache.sqlite.

Usage:
    python scripts/build_route_cache.py

Prerequisites:
    - public/data/road_graph.json must exist (run build_road_graph.py first)
    - public/data/catanduanes_datafile.geojson must exist
"""

from __future__ import annotations

import heapq
import json
import math
import sqlite3
import sys
import time
import zlib
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ROAD_GRAPH_PATH = PROJECT_ROOT / "public" / "data" / "road_graph.json"
GEOJSON_PATH = PROJECT_ROOT / "public" / "data" / "catanduanes_datafile.geojson"
CACHE_PATH = PROJECT_ROOT / "backend" / "data" / "route_cache.sqlite"

KEY_PRECISION = 6
AVERAGE_SPEED_KMH = 32
STOP_BUFFER_MINUTES = 3

# Hub locations (start points for itineraries)
HUBS = [
    (124.2355, 13.5834),  # Virac
    (124.0985, 13.5985),  # San Andres
]


def haversine(coord1: tuple[float, float], coord2: tuple[float, float]) -> float:
    """Distance in km between two (lng, lat) points."""
    lng1, lat1 = math.radians(coord1[0]), math.radians(coord1[1])
    lng2, lat2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def coordinate_key(coord: tuple[float, float]) -> str:
    return f"{coord[0]:.{KEY_PRECISION}f},{coord[1]:.{KEY_PRECISION}f}"


def estimate_duration(distance_km: float) -> int:
    if distance_km <= 0:
        return 0
    drive_minutes = (distance_km / AVERAGE_SPEED_KMH) * 60
    return max(1, math.ceil(drive_minutes + STOP_BUFFER_MINUTES))


class RoadGraph:
    """Compact road graph for A* pathfinding."""

    def __init__(self, data: dict):
        self.nodes: list[tuple[float, float]] = [tuple(n) for n in data["nodes"]]
        self.adjacency: list[list[tuple[int, float]]] = [[] for _ in self.nodes]
        self.edge_geometries: dict[str, list[list[float]]] = data.get("edge_geometries", {})
        self.edges_raw = data["edges"]

        for edge_idx, edge in enumerate(data["edges"]):
            from_idx, to_idx, dist_km = edge[0], edge[1], edge[2]
            self.adjacency[from_idx].append((to_idx, dist_km))
            self.adjacency[to_idx].append((from_idx, dist_km))

        # Spatial index: grid cells for fast nearest-node lookup
        self._grid: dict[tuple[int, int], list[int]] = {}
        self._grid_size = 0.01  # ~1km cells
        for idx, (lng, lat) in enumerate(self.nodes):
            cell = (int(lng / self._grid_size), int(lat / self._grid_size))
            self._grid.setdefault(cell, []).append(idx)

    def nearest_node(self, coord: tuple[float, float]) -> int:
        """Find nearest graph node to a coordinate."""
        lng, lat = coord
        cell_x = int(lng / self._grid_size)
        cell_y = int(lat / self._grid_size)

        best_idx = 0
        best_dist = float("inf")

        # Search in a 3x3 grid neighborhood
        for dx in range(-1, 2):
            for dy in range(-1, 2):
                cell = (cell_x + dx, cell_y + dy)
                for node_idx in self._grid.get(cell, []):
                    d = haversine(coord, self.nodes[node_idx])
                    if d < best_dist:
                        best_dist = d
                        best_idx = node_idx

        # If nothing found in 3x3, brute force (shouldn't happen for Catanduanes)
        if best_dist == float("inf"):
            for idx, node in enumerate(self.nodes):
                d = haversine(coord, node)
                if d < best_dist:
                    best_dist = d
                    best_idx = idx

        return best_idx

    def astar(self, start_idx: int, end_idx: int) -> tuple[list[int], float]:
        """A* shortest path. Returns (path_node_indices, total_distance_km)."""
        if start_idx == end_idx:
            return [start_idx], 0.0

        end_coord = self.nodes[end_idx]

        # Priority queue: (estimated_total, distance_so_far, node_idx)
        open_set: list[tuple[float, float, int]] = [(0.0, 0.0, start_idx)]
        came_from: dict[int, int] = {}
        g_score: dict[int, float] = {start_idx: 0.0}

        while open_set:
            _, current_g, current = heapq.heappop(open_set)

            if current == end_idx:
                # Reconstruct path
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                path.reverse()
                return path, current_g

            if current_g > g_score.get(current, float("inf")):
                continue

            for neighbor, edge_dist in self.adjacency[current]:
                tentative_g = current_g + edge_dist
                if tentative_g < g_score.get(neighbor, float("inf")):
                    g_score[neighbor] = tentative_g
                    came_from[neighbor] = current
                    h = haversine(self.nodes[neighbor], end_coord)
                    heapq.heappush(open_set, (tentative_g + h, tentative_g, neighbor))

        # No path found - return direct line
        return [start_idx, end_idx], haversine(self.nodes[start_idx], self.nodes[end_idx])

    def route(self, start: tuple[float, float], end: tuple[float, float]) -> tuple[list[tuple[float, float]], float]:
        """
        Compute full route geometry between two coordinates.
        Returns (list of (lng, lat) coordinates, distance_km).
        """
        start_idx = self.nearest_node(start)
        end_idx = self.nearest_node(end)

        path_indices, distance_km = self.astar(start_idx, end_idx)

        # Build full geometry including edge intermediate points
        geometry: list[tuple[float, float]] = [start]

        # Add start snap point if far from the nearest node
        start_node = self.nodes[start_idx]
        if haversine(start, start_node) > 0.01:  # >10m
            geometry.append(start_node)

        # Walk path and include edge geometries
        for i in range(len(path_indices) - 1):
            from_idx = path_indices[i]
            to_idx = path_indices[i + 1]

            # Find edge geometry if it exists
            edge_geom = self._find_edge_geometry(from_idx, to_idx)
            if edge_geom:
                geometry.extend(edge_geom)

            geometry.append(self.nodes[to_idx])

        # Add end point if different from last node
        end_node = self.nodes[end_idx]
        if haversine(end, end_node) > 0.01:
            geometry.append(end)

        # Add connection distances (start to start_node, end_node to end)
        distance_km += haversine(start, start_node) + haversine(end_node, end)

        # Deduplicate consecutive identical points
        deduped = [geometry[0]]
        for coord in geometry[1:]:
            if coord != deduped[-1]:
                deduped.append(coord)

        return deduped, round(distance_km, 4)

    def _find_edge_geometry(self, from_idx: int, to_idx: int) -> list[tuple[float, float]] | None:
        """Find intermediate geometry for an edge between two node indices."""
        # Look through edges to find the matching edge and its geometry
        for edge_idx, edge in enumerate(self.edges_raw):
            edge_from, edge_to = edge[0], edge[1]
            if (edge_from == from_idx and edge_to == to_idx):
                geom = self.edge_geometries.get(str(edge_idx))
                if geom:
                    return [tuple(c) for c in geom]
                return None
            elif (edge_from == to_idx and edge_to == from_idx):
                geom = self.edge_geometries.get(str(edge_idx))
                if geom:
                    return [tuple(c) for c in reversed(geom)]
                return None
        return None


def setup_database(db_path: Path) -> sqlite3.Connection:
    """Create or reset the route cache database."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS routes (
            start_key TEXT NOT NULL,
            end_key TEXT NOT NULL,
            geometry BLOB NOT NULL,
            distance_km REAL NOT NULL,
            duration_min INTEGER NOT NULL,
            PRIMARY KEY (start_key, end_key)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_routes_keys ON routes(start_key, end_key)")
    conn.commit()
    return conn


def insert_route(conn: sqlite3.Connection, start: tuple[float, float], end: tuple[float, float],
                 geometry: list[tuple[float, float]], distance_km: float, duration_min: int):
    """Insert a route into the cache (sorted key order for bidirectional lookup)."""
    start_key = coordinate_key(start)
    end_key = coordinate_key(end)
    first_key, second_key = sorted((start_key, end_key))

    # Store geometry in the canonical direction (first_key → second_key)
    if first_key != start_key:
        geometry = list(reversed(geometry))

    geom_json = json.dumps([[round(c[0], 6), round(c[1], 6)] for c in geometry]).encode("utf-8")
    geom_compressed = zlib.compress(geom_json, level=6)

    conn.execute(
        "INSERT OR REPLACE INTO routes (start_key, end_key, geometry, distance_km, duration_min) VALUES (?, ?, ?, ?, ?)",
        (first_key, second_key, geom_compressed, round(distance_km, 2), duration_min)
    )


def load_destinations() -> list[tuple[float, float]]:
    """Load unique destination coordinates from the GeoJSON."""
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    coords_set: set[tuple[float, float]] = set()
    for feature in data["features"]:
        if feature["geometry"]["type"] == "Point":
            c = feature["geometry"]["coordinates"]
            coords_set.add((round(c[0], 6), round(c[1], 6)))

    return sorted(coords_set)


def main():
    if not ROAD_GRAPH_PATH.exists():
        print(f"ERROR: {ROAD_GRAPH_PATH} not found. Run build_road_graph.py first.")
        sys.exit(1)

    if not GEOJSON_PATH.exists():
        print(f"ERROR: {GEOJSON_PATH} not found.")
        sys.exit(1)

    print("[1/4] Loading road graph...")
    with open(ROAD_GRAPH_PATH, "r", encoding="utf-8") as f:
        graph_data = json.load(f)
    graph = RoadGraph(graph_data)
    print(f"       {len(graph.nodes)} nodes, {len(graph.edges_raw)} edges")

    print("[2/4] Loading destinations...")
    destinations = load_destinations()
    # Add hubs
    all_points = list(set(destinations + HUBS))
    print(f"       {len(destinations)} destinations + {len(HUBS)} hubs = {len(all_points)} unique points")

    total_pairs = len(all_points) * (len(all_points) - 1) // 2
    print(f"[3/4] Computing {total_pairs} route pairs...")

    conn = setup_database(CACHE_PATH)
    computed = 0
    start_time = time.time()
    batch_size = 100

    for i in range(len(all_points)):
        for j in range(i + 1, len(all_points)):
            start = all_points[i]
            end = all_points[j]

            geometry, distance_km = graph.route(start, end)
            duration_min = estimate_duration(distance_km)
            insert_route(conn, start, end, geometry, distance_km, duration_min)

            computed += 1
            if computed % batch_size == 0:
                conn.commit()
                elapsed = time.time() - start_time
                rate = computed / elapsed if elapsed > 0 else 0
                eta = (total_pairs - computed) / rate if rate > 0 else 0
                print(f"\r       {computed}/{total_pairs} ({100 * computed / total_pairs:.1f}%) "
                      f"- {rate:.0f} routes/s - ETA {eta:.0f}s", end="", flush=True)

    conn.commit()
    conn.close()

    elapsed = time.time() - start_time
    print(f"\n       Done in {elapsed:.1f}s")

    cache_size_mb = CACHE_PATH.stat().st_size / (1024 * 1024)
    print(f"[4/4] Cache written to: {CACHE_PATH}")
    print(f"       Size: {cache_size_mb:.2f} MB")
    print(f"       Routes cached: {computed}")
    print()
    print("Done! Deploy road_graph.json + route_cache.sqlite to the Pi.")


if __name__ == "__main__":
    main()
