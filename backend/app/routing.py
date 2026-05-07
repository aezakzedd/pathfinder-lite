from __future__ import annotations

import heapq
import math
from dataclasses import dataclass
from typing import Iterable


Coordinate = tuple[float, float]

ROAD_SEGMENTS: list[list[Coordinate]] = [
    [
        (124.10, 13.60),
        (124.16, 13.58),
        (124.23, 13.58),
        (124.28, 13.61),
        (124.32, 13.64),
        (124.35, 13.65),
        (124.38, 13.70),
        (124.39, 13.78),
        (124.35, 13.81),
        (124.30, 13.84),
        (124.29, 13.89),
        (124.31, 13.94),
    ],
    [
        (124.31, 13.94),
        (124.25, 13.99),
        (124.17, 14.05),
        (124.11, 14.02),
        (124.07, 13.98),
        (124.04, 13.88),
        (124.04, 13.77),
        (124.07, 13.68),
        (124.10, 13.60),
    ],
    [
        (124.10, 13.60),
        (124.13, 13.68),
        (124.17, 13.75),
        (124.22, 13.80),
        (124.30, 13.84),
    ],
    [
        (124.23, 13.58),
        (124.20, 13.64),
        (124.17, 13.75),
        (124.10, 13.86),
        (124.07, 13.98),
    ],
    [
        (124.28, 13.61),
        (124.24, 13.68),
        (124.22, 13.80),
        (124.29, 13.89),
    ],
    [
        (124.35, 13.65),
        (124.30, 13.67),
        (124.24, 13.68),
        (124.17, 13.75),
    ],
]

KEY_PRECISION = 5
AVERAGE_SPEED_KMH = 32
STOP_BUFFER_MINUTES = 3
_BASE_GRAPH: Graph | None = None


@dataclass(frozen=True)
class RoadSegment:
    start: Coordinate
    end: Coordinate
    start_key: str
    end_key: str


@dataclass
class Graph:
    nodes: dict[str, Coordinate]
    edges: dict[str, list[tuple[str, float]]]
    segments: list[RoadSegment]


def build_route_response(raw_waypoints: Iterable[Iterable[float]]) -> dict:
    waypoints = normalize_waypoints(raw_waypoints)
    if len(waypoints) < 2:
        raise ValueError("At least two [lng, lat] waypoints are required.")

    geometry: list[Coordinate] = []
    distance_km = 0.0

    for index in range(len(waypoints) - 1):
        leg_geometry, leg_distance = build_leg_route(waypoints[index], waypoints[index + 1])
        append_coordinates(geometry, leg_geometry)
        distance_km += leg_distance

    distance_km = round(distance_km, 2)
    duration_min = estimate_duration_minutes(distance_km, len(waypoints) - 1)

    return {
        "geometry": [[round(lng, 6), round(lat, 6)] for lng, lat in geometry],
        "distance_km": distance_km,
        "duration_min": duration_min,
        "source": "local-road-router",
    }


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


def build_leg_route(start: Coordinate, end: Coordinate) -> tuple[list[Coordinate], float]:
    graph = clone_graph(get_base_graph())
    start_key = add_waypoint_to_graph(graph, start, "start")
    end_key = add_waypoint_to_graph(graph, end, "end")
    path_keys = shortest_path(graph, start_key, end_key)

    if len(path_keys) < 2:
        geometry = [start, end]
        return geometry, route_distance(geometry)

    geometry = [graph.nodes[key] for key in path_keys]
    return geometry, route_distance(geometry)


def get_base_graph() -> Graph:
    global _BASE_GRAPH
    if _BASE_GRAPH is not None:
        return _BASE_GRAPH

    nodes: dict[str, Coordinate] = {}
    edges: dict[str, list[tuple[str, float]]] = {}
    segments: list[RoadSegment] = []

    for road in ROAD_SEGMENTS:
        for index, coordinate in enumerate(road):
            add_node(nodes, edges, coordinate)
            if index > 0:
                start = road[index - 1]
                end = coordinate
                connect_coordinates(nodes, edges, start, end)
                segments.append(
                    RoadSegment(
                        start=start,
                        end=end,
                        start_key=coordinate_key(start),
                        end_key=coordinate_key(end),
                    )
                )

    _BASE_GRAPH = Graph(nodes=nodes, edges=edges, segments=segments)
    return _BASE_GRAPH


def clone_graph(graph: Graph) -> Graph:
    return Graph(
        nodes=dict(graph.nodes),
        edges={key: list(links) for key, links in graph.edges.items()},
        segments=graph.segments,
    )


def add_waypoint_to_graph(graph: Graph, coordinate: Coordinate, prefix: str) -> str:
    waypoint_key = f"{prefix}:{coordinate_key(coordinate)}"
    graph.nodes[waypoint_key] = coordinate
    graph.edges.setdefault(waypoint_key, [])

    snap_coordinate, start_key, end_key = nearest_road_snap(graph.segments, coordinate)
    snap_key = f"{prefix}:snap:{coordinate_key(snap_coordinate)}"
    graph.nodes[snap_key] = snap_coordinate
    graph.edges.setdefault(snap_key, [])

    connect_keys(graph, waypoint_key, snap_key)
    connect_keys(graph, snap_key, start_key)
    connect_keys(graph, snap_key, end_key)

    return waypoint_key


def nearest_road_snap(segments: list[RoadSegment], coordinate: Coordinate) -> tuple[Coordinate, str, str]:
    best: tuple[Coordinate, str, str, float] | None = None

    for segment in segments:
        projected = project_point_to_segment(coordinate, segment.start, segment.end)
        candidate_distance = haversine_distance(coordinate, projected)
        if best is None or candidate_distance < best[3]:
            best = (projected, segment.start_key, segment.end_key, candidate_distance)

    if best is None:
        key = coordinate_key(coordinate)
        return coordinate, key, key

    return best[0], best[1], best[2]


def project_point_to_segment(point: Coordinate, start: Coordinate, end: Coordinate) -> Coordinate:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length_squared = (dx * dx) + (dy * dy)
    if length_squared == 0:
        return start

    raw_t = (((point[0] - start[0]) * dx) + ((point[1] - start[1]) * dy)) / length_squared
    t = max(0.0, min(1.0, raw_t))
    return (start[0] + (dx * t), start[1] + (dy * t))


def shortest_path(graph: Graph, start_key: str, end_key: str) -> list[str]:
    distances: dict[str, float] = {start_key: 0.0}
    previous: dict[str, str] = {}
    queue: list[tuple[float, str]] = [(0.0, start_key)]
    visited: set[str] = set()

    while queue:
        current_distance, current_key = heapq.heappop(queue)
        if current_key in visited:
            continue

        visited.add(current_key)
        if current_key == end_key:
            break

        for next_key, weight in graph.edges.get(current_key, []):
            if next_key in visited:
                continue

            next_distance = current_distance + weight
            if next_distance < distances.get(next_key, math.inf):
                distances[next_key] = next_distance
                previous[next_key] = current_key
                heapq.heappush(queue, (next_distance, next_key))

    if end_key not in distances:
        return []

    path = [end_key]
    current = end_key
    while current != start_key:
        current = previous.get(current)
        if current is None:
            return []
        path.append(current)

    path.reverse()
    return path


def add_node(nodes: dict[str, Coordinate], edges: dict[str, list[tuple[str, float]]], coordinate: Coordinate) -> str:
    key = coordinate_key(coordinate)
    nodes.setdefault(key, coordinate)
    edges.setdefault(key, [])
    return key


def connect_coordinates(
    nodes: dict[str, Coordinate],
    edges: dict[str, list[tuple[str, float]]],
    start: Coordinate,
    end: Coordinate,
) -> None:
    start_key = add_node(nodes, edges, start)
    end_key = add_node(nodes, edges, end)
    connect_keys(Graph(nodes=nodes, edges=edges, segments=[]), start_key, end_key)


def connect_keys(graph: Graph, start_key: str, end_key: str) -> None:
    if start_key == end_key:
        return

    start = graph.nodes.get(start_key)
    end = graph.nodes.get(end_key)
    if start is None or end is None:
        return

    weight = haversine_distance(start, end)
    add_directed_edge(graph.edges, start_key, end_key, weight)
    add_directed_edge(graph.edges, end_key, start_key, weight)


def add_directed_edge(edges: dict[str, list[tuple[str, float]]], start_key: str, end_key: str, weight: float) -> None:
    links = edges.setdefault(start_key, [])
    if not any(next_key == end_key for next_key, _ in links):
        links.append((end_key, weight))


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
