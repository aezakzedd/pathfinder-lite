#!/usr/bin/env python3
"""
Extract Catanduanes road network from OSM PBF and produce a compact road_graph.json.

Usage:
    pip install osmium
    python scripts/build_road_graph.py catanduanes.osm.pbf

To get catanduanes.osm.pbf:
    1. Download https://download.geofabrik.de/asia/philippines-latest.osm.pbf
    2. osmium extract -b 124.0,13.5,124.5,14.1 philippines-latest.osm.pbf -o catanduanes.osm.pbf
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

try:
    import osmium
except ImportError:
    print("ERROR: osmium package required. Install with: pip install osmium")
    sys.exit(1)


# Highway types to include (covers all drivable roads on the island)
HIGHWAY_TYPES = {
    "motorway", "trunk", "primary", "secondary", "tertiary",
    "unclassified", "residential", "service", "track",
    "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link",
    "living_street", "road",
}

# Bounding box for Catanduanes (loose, for validation)
BOUNDS = {
    "min_lng": 123.9,
    "max_lng": 124.6,
    "min_lat": 13.4,
    "max_lat": 14.2,
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"


class WayCollector(osmium.SimpleHandler):
    """First pass: collect all highway ways and referenced node IDs."""

    def __init__(self):
        super().__init__()
        self.ways: list[dict] = []
        self.needed_nodes: set[int] = set()

    def way(self, w):
        highway = w.tags.get("highway")
        if not highway or highway not in HIGHWAY_TYPES:
            return

        node_ids = [n.ref for n in w.nodes]
        if len(node_ids) < 2:
            return

        self.ways.append({
            "highway": highway,
            "node_ids": node_ids,
        })
        self.needed_nodes.update(node_ids)


class NodeCollector(osmium.SimpleHandler):
    """Second pass: collect coordinates for needed nodes."""

    def __init__(self, needed_nodes: set[int]):
        super().__init__()
        self.needed_nodes = needed_nodes
        self.node_coords: dict[int, tuple[float, float]] = {}

    def node(self, n):
        if n.id in self.needed_nodes:
            lng = n.location.lon
            lat = n.location.lat
            if (BOUNDS["min_lng"] <= lng <= BOUNDS["max_lng"] and
                    BOUNDS["min_lat"] <= lat <= BOUNDS["max_lat"]):
                self.node_coords[n.id] = (round(lng, 6), round(lat, 6))


def haversine(coord1: tuple[float, float], coord2: tuple[float, float]) -> float:
    """Distance in km between two (lng, lat) points."""
    lng1, lat1 = math.radians(coord1[0]), math.radians(coord1[1])
    lng2, lat2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_graph(ways: list[dict], node_coords: dict[int, tuple[float, float]]):
    """
    Build a graph from OSM ways.
    Nodes are intersections (degree != 2) and way endpoints.
    Edges are simplified road segments between intersections.
    """
    # Count how many ways reference each node (to find intersections)
    node_way_count: dict[int, int] = defaultdict(int)
    for way in ways:
        for nid in way["node_ids"]:
            node_way_count[nid] += 1
        # Endpoints are always graph nodes
        node_way_count[way["node_ids"][0]] += 10
        node_way_count[way["node_ids"][-1]] += 10

    # A node becomes a graph vertex if it's an intersection (used by 2+ ways),
    # a way endpoint, or a dead end
    def is_graph_node(nid: int) -> bool:
        return node_way_count.get(nid, 0) >= 2

    # Build edges by walking each way and splitting at graph nodes
    # node_id -> index in final nodes list
    graph_node_ids: set[int] = set()
    edges_raw: list[tuple[int, int, float, list[tuple[float, float]]]] = []

    for way in ways:
        nids = [nid for nid in way["node_ids"] if nid in node_coords]
        if len(nids) < 2:
            continue

        # Mark first and last as graph nodes
        graph_node_ids.add(nids[0])
        graph_node_ids.add(nids[-1])

        # Also mark intermediate intersections
        for nid in nids[1:-1]:
            if is_graph_node(nid):
                graph_node_ids.add(nid)

        # Walk the way and split into edges at graph nodes
        segment_start = 0
        for i in range(1, len(nids)):
            if nids[i] in graph_node_ids:
                # Build edge from segment_start to i
                segment_nids = nids[segment_start:i + 1]
                coords = [node_coords[nid] for nid in segment_nids]
                dist = sum(haversine(coords[j], coords[j + 1]) for j in range(len(coords) - 1))

                # Simplify intermediate geometry (Douglas-Peucker-like: keep only significant points)
                simplified = simplify_coords(coords, tolerance=0.0003)

                edges_raw.append((nids[segment_start], nids[i], dist, simplified))
                segment_start = i

    # Build final node list and index mapping
    node_id_list = sorted(graph_node_ids)
    node_id_to_idx = {nid: idx for idx, nid in enumerate(node_id_list)}
    nodes = [node_coords[nid] for nid in node_id_list]

    # Build edge list
    edges = []
    edge_geometries = []
    seen_edges: set[tuple[int, int]] = set()

    for from_nid, to_nid, dist_km, geometry in edges_raw:
        if from_nid not in node_id_to_idx or to_nid not in node_id_to_idx:
            continue

        from_idx = node_id_to_idx[from_nid]
        to_idx = node_id_to_idx[to_nid]
        if from_idx == to_idx:
            continue

        # Deduplicate (undirected)
        edge_key = (min(from_idx, to_idx), max(from_idx, to_idx))
        if edge_key in seen_edges:
            continue
        seen_edges.add(edge_key)

        edges.append([from_idx, to_idx, round(dist_km, 4)])
        # Only store intermediate geometry if it has > 2 points (not just endpoints)
        if len(geometry) > 2:
            edge_geometries.append(geometry[1:-1])  # Exclude endpoints (they're in nodes)
        else:
            edge_geometries.append(None)

    return nodes, edges, edge_geometries


def simplify_coords(coords: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    """Simplify a polyline using Douglas-Peucker algorithm."""
    if len(coords) <= 2:
        return coords

    # Find point with max distance from line between first and last
    max_dist = 0.0
    max_idx = 0
    start = coords[0]
    end = coords[-1]

    for i in range(1, len(coords) - 1):
        d = point_line_distance(coords[i], start, end)
        if d > max_dist:
            max_dist = d
            max_idx = i

    if max_dist > tolerance:
        left = simplify_coords(coords[:max_idx + 1], tolerance)
        right = simplify_coords(coords[max_idx:], tolerance)
        return left[:-1] + right
    else:
        return [coords[0], coords[-1]]


def point_line_distance(point: tuple[float, float], line_start: tuple[float, float], line_end: tuple[float, float]) -> float:
    """Perpendicular distance from point to line segment (in degrees, good enough for simplification)."""
    dx = line_end[0] - line_start[0]
    dy = line_end[1] - line_start[1]
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.sqrt((point[0] - line_start[0]) ** 2 + (point[1] - line_start[1]) ** 2)

    t = max(0, min(1, ((point[0] - line_start[0]) * dx + (point[1] - line_start[1]) * dy) / length_sq))
    proj_x = line_start[0] + t * dx
    proj_y = line_start[1] + t * dy
    return math.sqrt((point[0] - proj_x) ** 2 + (point[1] - proj_y) ** 2)


def main():
    if len(sys.argv) < 2:
        print("Usage: python build_road_graph.py <catanduanes.osm.pbf>")
        print()
        print("To obtain the PBF file:")
        print("  1. Download https://download.geofabrik.de/asia/philippines-latest.osm.pbf")
        print("  2. osmium extract -b 124.0,13.5,124.5,14.1 philippines-latest.osm.pbf -o catanduanes.osm.pbf")
        sys.exit(1)

    pbf_path = sys.argv[1]
    if not Path(pbf_path).exists():
        print(f"ERROR: File not found: {pbf_path}")
        sys.exit(1)

    print(f"[1/4] Collecting ways from {pbf_path}...")
    way_collector = WayCollector()
    way_collector.apply_file(pbf_path, locations=True)
    print(f"       Found {len(way_collector.ways)} highway ways, {len(way_collector.needed_nodes)} node refs")

    print("[2/4] Collecting node coordinates...")
    node_collector = NodeCollector(way_collector.needed_nodes)
    node_collector.apply_file(pbf_path, locations=True)
    print(f"       Resolved {len(node_collector.node_coords)} nodes within bounds")

    print("[3/4] Building graph (simplifying road segments)...")
    nodes, edges, edge_geometries = build_graph(way_collector.ways, node_collector.node_coords)
    print(f"       Graph: {len(nodes)} nodes, {len(edges)} edges")

    # Calculate total road km
    total_km = sum(e[2] for e in edges)
    print(f"       Total road length: {total_km:.1f} km")

    print("[4/4] Writing road_graph.json...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "road_graph.json"

    # Build output format
    output = {
        "version": 1,
        "nodes": nodes,
        "edges": edges,
    }

    # Include edge geometries only for edges with intermediate points
    geometries = {}
    for i, geom in enumerate(edge_geometries):
        if geom:
            geometries[str(i)] = [[round(c[0], 6), round(c[1], 6)] for c in geom]

    if geometries:
        output["edge_geometries"] = geometries

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"))

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"       Written to: {output_path}")
    print(f"       File size: {file_size_mb:.2f} MB")
    print()
    print("Done! Next step: python scripts/build_route_cache.py")


if __name__ == "__main__":
    main()
