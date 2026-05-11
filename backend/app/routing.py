from __future__ import annotations

import heapq
import json
import math
from pathlib import Path
from typing import Iterable

from .route_cache import build_cached_route_response


Coordinate = tuple[float, float]

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ROAD_GRAPH_PATH = BACKEND_ROOT.parent / "public" / "data" / "road_graph.json"

KEY_PRECISION = 5
AVERAGE_SPEED_KMH = 32
STOP_BUFFER_MINUTES = 3

_DENSE_GRAPH: DenseRoadGraph | None = None


class DenseRoadGraph:
    """Compact road graph loaded from road_graph.json for A* routing."""

    def __init__(self, data: dict):
        self.nodes: list[Coordinate] = [tuple(n) for n in data["nodes"]]
        self.adjacency: list[list[tuple[int, float]]] = [[] for _ in self.nodes]
        self.edge_geometries: dict[str, list[list[float]]] = data.get("edge_geometries", {})
        self.edges_raw: list[list] = data["edges"]

        for edge in data["edges"]:
            from_idx, to_idx, dist_km = int(edge[0]), int(edge[1]), float(edge[2])
            self.adjacency[from_idx].append((to_idx, dist_km))
            self.adjacency[to_idx].append((from_idx, dist_km))

        # Spatial grid for fast nearest-node lookups
        self._grid: dict[tuple[int, int], list[int]] = {}
        self._grid_size = 0.01
        for idx, (lng, lat) in enumerate(self.nodes):
            cell = (int(lng / self._grid_size), int(lat / self._grid_size))
            self._grid.setdefault(cell, []).append(idx)

    def nearest_node(self, coord: Coordinate) -> int:
        lng, lat = coord
        cell_x = int(lng / self._grid_size)
        cell_y = int(lat / self._grid_size)

        best_idx = 0
        best_dist = float("inf")

        for dx in range(-2, 3):
            for dy in range(-2, 3):
                cell = (cell_x + dx, cell_y + dy)
                for node_idx in self._grid.get(cell, []):
                    d = haversine_distance(coord, self.nodes[node_idx])
                    if d < best_dist:
                        best_dist = d
                        best_idx = node_idx

        if best_dist == float("inf"):
            for idx, node in enumerate(self.nodes):
                d = haversine_distance(coord, node)
                if d < best_dist:
                    best_dist = d
                    best_idx = idx

        return best_idx

    def astar(self, start_idx: int, end_idx: int) -> tuple[list[int], float]:
        if start_idx == end_idx:
            return [start_idx], 0.0

        end_coord = self.nodes[end_idx]
        open_set: list[tuple[float, float, int]] = [(0.0, 0.0, start_idx)]
        came_from: dict[int, int] = {}
        g_score: dict[int, float] = {start_idx: 0.0}

        while open_set:
            _, current_g, current = heapq.heappop(open_set)

            if current == end_idx:
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
                    h = haversine_distance(self.nodes[neighbor], end_coord)
                    heapq.heappush(open_set, (tentative_g + h, tentative_g, neighbor))

        return [start_idx, end_idx], haversine_distance(self.nodes[start_idx], self.nodes[end_idx])

    def find_edge_geometry(self, from_idx: int, to_idx: int) -> list[Coordinate] | None:
        for edge_idx, edge in enumerate(self.edges_raw):
            if edge[0] == from_idx and edge[1] == to_idx:
                geom = self.edge_geometries.get(str(edge_idx))
                return [tuple(c) for c in geom] if geom else None
            elif edge[0] == to_idx and edge[1] == from_idx:
                geom = self.edge_geometries.get(str(edge_idx))
                return [tuple(c) for c in reversed(geom)] if geom else None
        return None

    def route(self, start: Coordinate, end: Coordinate) -> tuple[list[Coordinate], float]:
        start_idx = self.nearest_node(start)
        end_idx = self.nearest_node(end)

        path_indices, distance_km = self.astar(start_idx, end_idx)

        geometry: list[Coordinate] = [start]
        start_node = self.nodes[start_idx]
        if haversine_distance(start, start_node) > 0.01:
            geometry.append(start_node)

        for i in range(len(path_indices) - 1):
            edge_geom = self.find_edge_geometry(path_indices[i], path_indices[i + 1])
            if edge_geom:
                geometry.extend(edge_geom)
            geometry.append(self.nodes[path_indices[i + 1]])

        end_node = self.nodes[end_idx]
        if haversine_distance(end, end_node) > 0.01:
            geometry.append(end)

        distance_km += haversine_distance(start, start_node) + haversine_distance(end_node, end)

        deduped = [geometry[0]]
        for coord in geometry[1:]:
            if coord != deduped[-1]:
                deduped.append(coord)

        return deduped, round(distance_km, 4)


def get_dense_graph() -> DenseRoadGraph | None:
    global _DENSE_GRAPH
    if _DENSE_GRAPH is not None:
        return _DENSE_GRAPH

    if not ROAD_GRAPH_PATH.exists():
        return None

    try:
        with open(ROAD_GRAPH_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        _DENSE_GRAPH = DenseRoadGraph(data)
        return _DENSE_GRAPH
    except Exception:
        return None


# --- Sparse fallback (original 30-point skeleton) ---

ROAD_SEGMENTS: list[list[Coordinate]] = [
    [
        (124.10, 13.60), (124.16, 13.58), (124.23, 13.58), (124.28, 13.61),
        (124.32, 13.64), (124.35, 13.65), (124.38, 13.70), (124.39, 13.78),
        (124.35, 13.81), (124.30, 13.84), (124.29, 13.89), (124.31, 13.94),
    ],
    [
        (124.31, 13.94), (124.25, 13.99), (124.17, 14.05), (124.11, 14.02),
        (124.07, 13.98), (124.04, 13.88), (124.04, 13.77), (124.07, 13.68),
        (124.10, 13.60),
    ],
    [
        (124.10, 13.60), (124.13, 13.68), (124.17, 13.75), (124.22, 13.80),
        (124.30, 13.84),
    ],
    [
        (124.23, 13.58), (124.20, 13.64), (124.17, 13.75), (124.10, 13.86),
        (124.07, 13.98),
    ],
    [
        (124.28, 13.61), (124.24, 13.68), (124.22, 13.80), (124.29, 13.89),
    ],
    [
        (124.35, 13.65), (124.30, 13.67), (124.24, 13.68), (124.17, 13.75),
    ],
]

_SPARSE_SEGMENTS: list[tuple[Coordinate, Coordinate]] | None = None


def _get_sparse_segments() -> list[tuple[Coordinate, Coordinate]]:
    global _SPARSE_SEGMENTS
    if _SPARSE_SEGMENTS is not None:
        return _SPARSE_SEGMENTS

    segments = []
    for road in ROAD_SEGMENTS:
        for i in range(len(road) - 1):
            segments.append((road[i], road[i + 1]))
    _SPARSE_SEGMENTS = segments
    return _SPARSE_SEGMENTS


def build_route_response(raw_waypoints: Iterable[Iterable[float]]) -> dict:
    waypoints = normalize_waypoints(raw_waypoints)
    if len(waypoints) < 2:
        raise ValueError("At least two [lng, lat] waypoints are required.")

    cached_response = build_cached_route_response(waypoints)
    if cached_response:
        return cached_response

    # Try dense graph first
    dense = get_dense_graph()
    if dense:
        return _route_with_dense_graph(dense, waypoints)

    # Fall back to sparse graph
    return _route_with_sparse_graph(waypoints)


def _route_with_dense_graph(graph: DenseRoadGraph, waypoints: list[Coordinate]) -> dict:
    geometry: list[Coordinate] = []
    distance_km = 0.0

    for i in range(len(waypoints) - 1):
        leg_geom, leg_dist = graph.route(waypoints[i], waypoints[i + 1])
        append_coordinates(geometry, leg_geom)
        distance_km += leg_dist

    distance_km = round(distance_km, 2)
    duration_min = estimate_duration_minutes(distance_km, len(waypoints) - 1)

    return {
        "geometry": [[round(lng, 6), round(lat, 6)] for lng, lat in geometry],
        "distance_km": distance_km,
        "duration_min": duration_min,
        "source": "local-road-router",
        "is_fallback": False,
    }


def _route_with_sparse_graph(waypoints: list[Coordinate]) -> dict:
    geometry: list[Coordinate] = []
    distance_km = 0.0

    segments = _get_sparse_segments()

    for i in range(len(waypoints) - 1):
        start = waypoints[i]
        end = waypoints[i + 1]

        # Snap to nearest segment endpoints and draw through them
        start_snap = _snap_to_sparse(segments, start)
        end_snap = _snap_to_sparse(segments, end)

        leg = [start, start_snap, end_snap, end]
        append_coordinates(geometry, leg)
        distance_km += route_distance(leg)

    distance_km = round(distance_km, 2)
    duration_min = estimate_duration_minutes(distance_km, len(waypoints) - 1)

    return {
        "geometry": [[round(lng, 6), round(lat, 6)] for lng, lat in geometry],
        "distance_km": distance_km,
        "duration_min": duration_min,
        "source": "fallback-approximate-road-network",
        "is_fallback": True,
    }


def _snap_to_sparse(segments: list[tuple[Coordinate, Coordinate]], coord: Coordinate) -> Coordinate:
    best_dist = float("inf")
    best_point = coord
    for seg_start, seg_end in segments:
        projected = project_point_to_segment(coord, seg_start, seg_end)
        d = haversine_distance(coord, projected)
        if d < best_dist:
            best_dist = d
            best_point = projected
    return best_point


def normalize_waypoints(raw_waypoints: Iterable[Iterable[float]]) -> list[Coordinate]:
    waypoints: list[Coordinate] = []

    for raw in raw_waypoints or []:
        values = list(raw)
        if len(values) < 2:
            continue

        lng = float(values[0])
        lat = float(values[1])
        if not (math.isfinite(lng) and math.isfinite(lat)):
            continue

        waypoints.append((lng, lat))

    return waypoints


def project_point_to_segment(point: Coordinate, start: Coordinate, end: Coordinate) -> Coordinate:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length_squared = (dx * dx) + (dy * dy)
    if length_squared == 0:
        return start

    raw_t = (((point[0] - start[0]) * dx) + ((point[1] - start[1]) * dy)) / length_squared
    t = max(0.0, min(1.0, raw_t))
    return (start[0] + (dx * t), start[1] + (dy * t))


def append_coordinates(target: list[Coordinate], coordinates: list[Coordinate]) -> None:
    for coordinate in coordinates:
        if not target or coordinate_key(target[-1]) != coordinate_key(coordinate):
            target.append(coordinate)


def route_distance(coordinates: list[Coordinate]) -> float:
    return sum(
        haversine_distance(coordinates[index - 1], coordinates[index])
        for index in range(1, len(coordinates))
    )


def estimate_duration_minutes(distance_km: float, leg_count: int) -> int:
    if distance_km <= 0:
        return 0

    drive_minutes = (distance_km / AVERAGE_SPEED_KMH) * 60
    return max(1, math.ceil(drive_minutes + (leg_count * STOP_BUFFER_MINUTES)))


def haversine_distance(start: Coordinate, end: Coordinate) -> float:
    earth_radius_km = 6371.0
    lng1, lat1 = map(math.radians, start)
    lng2, lat2 = map(math.radians, end)
    delta_lat = lat2 - lat1
    delta_lng = lng2 - lng1
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * (math.sin(delta_lng / 2) ** 2)
    )
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def coordinate_key(coordinate: Coordinate) -> str:
    return f"{coordinate[0]:.{KEY_PRECISION}f},{coordinate[1]:.{KEY_PRECISION}f}"
