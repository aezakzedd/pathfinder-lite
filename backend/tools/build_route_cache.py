from __future__ import annotations

import argparse
import heapq
import json
import math
import sqlite3
import zlib
from dataclasses import dataclass
from pathlib import Path


Coordinate = tuple[float, float]

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROADS = ROOT / "backend" / "data" / "catanduanes_optimized.json"
REFERENCE_ROADS = ROOT.parent / "src" / "frontend" / "data" / "catanduanes_optimized.json"
DEFAULT_DESTINATIONS = ROOT / "public" / "data" / "catanduanes_datafile.geojson"
DEFAULT_OUTPUT = ROOT / "backend" / "data" / "route_cache.sqlite"

KEY_PRECISION = 6
GEOMETRY_PRECISION = 5
SIMPLIFY_TOLERANCE = 0.00004
AVERAGE_SPEED_KMH = 32
STOP_BUFFER_MINUTES = 3

HUBS = [
    {"id": "hub-virac", "name": "Virac", "coordinates": [124.23, 13.58]},
    {"id": "hub-san-andres", "name": "San Andres", "coordinates": [124.10, 13.60]},
]


@dataclass
class Graph:
    nodes: dict[str, Coordinate]
    edges: dict[str, list[tuple[str, float]]]


@dataclass
class Anchor:
    key: str
    name: str
    coordinate: Coordinate
    snap_key: str


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Pathfinder Lite precomputed route cache.")
    parser.add_argument("--roads", type=Path, default=None)
    parser.add_argument("--destinations", type=Path, default=DEFAULT_DESTINATIONS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--nearest", type=int, default=18, help="Nearest POI neighbors to cache per destination.")
    args = parser.parse_args()

    road_path = resolve_road_path(args.roads)
    graph = build_graph(load_road_lines(road_path))
    anchors = build_anchors(args.destinations, graph)
    write_route_cache(args.output, graph, anchors, road_path, args.destinations, args.nearest)


def resolve_road_path(requested: Path | None) -> Path:
    candidates = [requested, DEFAULT_ROADS, REFERENCE_ROADS]
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate
    raise FileNotFoundError(
        "No road GeoJSON found. Place catanduanes_optimized.json in backend/data/ "
        "or pass --roads <path>."
    )


def load_road_lines(path: Path) -> list[list[Coordinate]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    lines: list[list[Coordinate]] = []

    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        geometry_type = geometry.get("type")

        if geometry_type == "LineString":
            line = normalize_line(geometry.get("coordinates", []))
            if len(line) >= 2:
                lines.append(line)
        elif geometry_type == "MultiLineString":
            for raw_line in geometry.get("coordinates", []):
                line = normalize_line(raw_line)
                if len(line) >= 2:
                    lines.append(line)

    if not lines:
        raise ValueError(f"No LineString road geometry found in {path}")

    return lines


def normalize_line(raw_coordinates: list) -> list[Coordinate]:
    line: list[Coordinate] = []
    for raw in raw_coordinates:
        if not isinstance(raw, (list, tuple)) or len(raw) < 2:
            continue
        lng = float(raw[0])
        lat = float(raw[1])
        if math.isfinite(lng) and math.isfinite(lat):
            line.append((lng, lat))
    return line


def build_graph(lines: list[list[Coordinate]]) -> Graph:
    nodes: dict[str, Coordinate] = {}
    edges: dict[str, list[tuple[str, float]]] = {}

    for line in lines:
        previous_key = None
        for coordinate in line:
            key = coordinate_key(coordinate)
            nodes.setdefault(key, coordinate)
            edges.setdefault(key, [])

            if previous_key and previous_key != key:
                connect_keys(nodes, edges, previous_key, key)

            previous_key = key

    return Graph(nodes=nodes, edges=edges)


def build_anchors(destination_path: Path, graph: Graph) -> list[Anchor]:
    data = json.loads(destination_path.read_text(encoding="utf-8"))
    anchors: dict[str, Anchor] = {}

    for hub in HUBS:
        add_anchor(anchors, graph, hub["name"], hub["coordinates"])

    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Point":
            continue

        properties = feature.get("properties") or {}
        name = properties.get("name") or properties.get("NAME") or "Destination"
        add_anchor(anchors, graph, name, geometry.get("coordinates", []))

    return sorted(anchors.values(), key=lambda anchor: anchor.key)


def add_anchor(anchors: dict[str, Anchor], graph: Graph, name: str, raw_coordinate: list | tuple) -> None:
    if len(raw_coordinate) < 2:
        return

    coordinate = (float(raw_coordinate[0]), float(raw_coordinate[1]))
    key = coordinate_key(coordinate)
    if key in anchors:
        return

    anchors[key] = Anchor(
        key=key,
        name=str(name),
        coordinate=coordinate,
        snap_key=find_nearest_node(graph, coordinate),
    )


def write_route_cache(output_path: Path, graph: Graph, anchors: list[Anchor], road_path: Path, destination_path: Path, nearest_count: int) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    with sqlite3.connect(output_path) as connection:
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute("CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        connection.execute(
            """
            CREATE TABLE anchors (
              key TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              lng REAL NOT NULL,
              lat REAL NOT NULL,
              snap_key TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE routes (
              start_key TEXT NOT NULL,
              end_key TEXT NOT NULL,
              geometry BLOB NOT NULL,
              distance_km REAL NOT NULL,
              duration_min INTEGER NOT NULL,
              PRIMARY KEY (start_key, end_key)
            )
            """
        )

        route_pairs = build_route_pairs(anchors, nearest_count)
        metadata = {
            "source": "precomputed-local-road-cache",
            "road_file": str(road_path.name),
            "destination_file": str(destination_path.name),
            "anchor_count": str(len(anchors)),
            "node_count": str(len(graph.nodes)),
            "pair_strategy": f"hubs+{nearest_count}-nearest-poi-neighbors",
            "planned_route_count": str(len(route_pairs)),
        }
        connection.executemany("INSERT INTO metadata (key, value) VALUES (?, ?)", metadata.items())
        connection.executemany(
            "INSERT INTO anchors (key, name, lng, lat, snap_key) VALUES (?, ?, ?, ?, ?)",
            [(anchor.key, anchor.name, anchor.coordinate[0], anchor.coordinate[1], anchor.snap_key) for anchor in anchors],
        )

        route_rows = []
        routes_by_start: dict[str, list[Anchor]] = {}
        anchors_by_key = {anchor.key: anchor for anchor in anchors}
        for start_key, end_key in route_pairs:
            routes_by_start.setdefault(start_key, []).append(anchors_by_key[end_key])

        route_count = 0
        for start_key, end_anchors in routes_by_start.items():
            start = anchors_by_key[start_key]
            distances, previous = shortest_paths(graph, start.snap_key)
            for end in end_anchors:
                if end.snap_key not in distances:
                    continue

                path = reconstruct_path(previous, start.snap_key, end.snap_key)
                if len(path) < 2:
                    continue

                geometry = [start.coordinate]
                geometry.extend(graph.nodes[key] for key in path)
                geometry.append(end.coordinate)
                geometry = simplify_route_geometry(geometry)
                distance_km = round(route_distance(geometry), 2)
                duration_min = estimate_duration_minutes(distance_km)

                first_key, second_key = sorted((start.key, end.key))
                if first_key != start.key:
                    geometry = list(reversed(geometry))

                route_rows.append((
                    first_key,
                    second_key,
                    zlib.compress(json.dumps(round_geometry(geometry), separators=(",", ":")).encode("utf-8"), level=9),
                    distance_km,
                    duration_min,
                ))
                route_count += 1

            if len(route_rows) >= 1000:
                connection.executemany(
                    "INSERT INTO routes (start_key, end_key, geometry, distance_km, duration_min) VALUES (?, ?, ?, ?, ?)",
                    route_rows,
                )
                route_rows.clear()

        if route_rows:
            connection.executemany(
                "INSERT INTO routes (start_key, end_key, geometry, distance_km, duration_min) VALUES (?, ?, ?, ?, ?)",
                route_rows,
            )

        connection.execute("CREATE INDEX idx_routes_keys ON routes (start_key, end_key)")
        connection.execute("INSERT INTO metadata (key, value) VALUES (?, ?)", ("route_count", str(route_count)))
        connection.commit()
        connection.execute("VACUUM")

    print(f"Wrote {route_count} cached routes for {len(anchors)} anchors to {output_path}")


def build_route_pairs(anchors: list[Anchor], nearest_count: int) -> set[tuple[str, str]]:
    hubs = [anchor for anchor in anchors if anchor.key in {coordinate_key((124.23, 13.58)), coordinate_key((124.10, 13.60))}]
    pois = [anchor for anchor in anchors if anchor not in hubs]
    pairs: set[tuple[str, str]] = set()

    for hub in hubs:
        for poi in pois:
            pairs.add(canonical_pair(hub.key, poi.key))

    for anchor in pois:
        nearest = sorted(
            (candidate for candidate in pois if candidate.key != anchor.key),
            key=lambda candidate: haversine_distance(anchor.coordinate, candidate.coordinate),
        )[:max(0, nearest_count)]

        for candidate in nearest:
            pairs.add(canonical_pair(anchor.key, candidate.key))

    return pairs


def canonical_pair(first_key: str, second_key: str) -> tuple[str, str]:
    return tuple(sorted((first_key, second_key)))


def shortest_paths(graph: Graph, start_key: str) -> tuple[dict[str, float], dict[str, str]]:
    distances: dict[str, float] = {start_key: 0.0}
    previous: dict[str, str] = {}
    queue: list[tuple[float, str]] = [(0.0, start_key)]
    visited: set[str] = set()

    while queue:
        current_distance, current_key = heapq.heappop(queue)
        if current_key in visited:
            continue

        visited.add(current_key)
        for next_key, weight in graph.edges.get(current_key, []):
            if next_key in visited:
                continue

            next_distance = current_distance + weight
            if next_distance < distances.get(next_key, math.inf):
                distances[next_key] = next_distance
                previous[next_key] = current_key
                heapq.heappush(queue, (next_distance, next_key))

    return distances, previous


def reconstruct_path(previous: dict[str, str], start_key: str, end_key: str) -> list[str]:
    path = [end_key]
    current = end_key

    while current != start_key:
        current = previous.get(current)
        if current is None:
            return []
        path.append(current)

    path.reverse()
    return path


def simplify_route_geometry(coordinates: list[Coordinate]) -> list[Coordinate]:
    deduped = dedupe_coordinates(coordinates)
    if len(deduped) <= 2:
        return deduped
    return rdp(deduped, SIMPLIFY_TOLERANCE)


def rdp(points: list[Coordinate], tolerance: float) -> list[Coordinate]:
    if len(points) <= 2:
        return points

    first = points[0]
    last = points[-1]
    max_distance = -1.0
    index = 0

    for point_index in range(1, len(points) - 1):
        distance = perpendicular_distance(points[point_index], first, last)
        if distance > max_distance:
            max_distance = distance
            index = point_index

    if max_distance <= tolerance:
        return [first, last]

    return rdp(points[:index + 1], tolerance)[:-1] + rdp(points[index:], tolerance)


def perpendicular_distance(point: Coordinate, start: Coordinate, end: Coordinate) -> float:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    if dx == 0 and dy == 0:
        return math.hypot(point[0] - start[0], point[1] - start[1])

    return abs((dy * point[0]) - (dx * point[1]) + (end[0] * start[1]) - (end[1] * start[0])) / math.hypot(dx, dy)


def dedupe_coordinates(coordinates: list[Coordinate]) -> list[Coordinate]:
    result: list[Coordinate] = []
    previous_key = ""
    for coordinate in coordinates:
        key = coordinate_key(coordinate)
        if key != previous_key:
            result.append(coordinate)
            previous_key = key
    return result


def round_geometry(coordinates: list[Coordinate]) -> list[list[float]]:
    return [[round(lng, GEOMETRY_PRECISION), round(lat, GEOMETRY_PRECISION)] for lng, lat in coordinates]


def find_nearest_node(graph: Graph, coordinate: Coordinate) -> str:
    best_key = ""
    best_distance = math.inf

    for key, node in graph.nodes.items():
        distance = haversine_distance(coordinate, node)
        if distance < best_distance:
            best_key = key
            best_distance = distance

    return best_key


def connect_keys(
    nodes: dict[str, Coordinate],
    edges: dict[str, list[tuple[str, float]]],
    start_key: str,
    end_key: str,
) -> None:
    start = nodes[start_key]
    end = nodes[end_key]
    distance = haversine_distance(start, end)
    edges[start_key].append((end_key, distance))
    edges[end_key].append((start_key, distance))


def route_distance(coordinates: list[Coordinate]) -> float:
    return sum(
        haversine_distance(coordinates[index - 1], coordinates[index])
        for index in range(1, len(coordinates))
    )


def estimate_duration_minutes(distance_km: float) -> int:
    if distance_km <= 0:
        return 0
    return max(1, math.ceil(((distance_km / AVERAGE_SPEED_KMH) * 60) + STOP_BUFFER_MINUTES))


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


if __name__ == "__main__":
    main()
