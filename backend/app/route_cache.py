from __future__ import annotations

import json
import sqlite3
import zlib
from pathlib import Path
from typing import Iterable


Coordinate = tuple[float, float]

BACKEND_ROOT = Path(__file__).resolve().parents[1]
CACHE_PATH = BACKEND_ROOT / "data" / "route_cache.sqlite"
KEY_PRECISION = 6


def build_cached_route_response(raw_waypoints: Iterable[Iterable[float]]) -> dict | None:
    waypoints = normalize_waypoints(raw_waypoints)
    if len(waypoints) < 2 or not CACHE_PATH.exists():
        return None

    geometry: list[Coordinate] = []
    distance_km = 0.0
    duration_min = 0

    try:
        with sqlite3.connect(f"file:{CACHE_PATH}?mode=ro", uri=True) as connection:
            for index in range(len(waypoints) - 1):
                leg = get_cached_leg(connection, waypoints[index], waypoints[index + 1])
                if leg is None:
                    return None

                append_coordinates(geometry, leg["geometry"])
                distance_km += leg["distance_km"]
                duration_min += leg["duration_min"]
    except sqlite3.Error:
        return None

    if len(geometry) < 2:
        return None

    return {
        "geometry": [[round(lng, 6), round(lat, 6)] for lng, lat in geometry],
        "distance_km": round(distance_km, 2),
        "duration_min": round(duration_min),
        "source": "local-road-router",
        "cache": "precomputed",
    }


def get_cached_leg(connection: sqlite3.Connection, start: Coordinate, end: Coordinate) -> dict | None:
    start_key = coordinate_key(start)
    end_key = coordinate_key(end)
    first_key, second_key = sorted((start_key, end_key))

    row = connection.execute(
        """
        SELECT geometry, distance_km, duration_min
        FROM routes
        WHERE start_key = ? AND end_key = ?
        """,
        (first_key, second_key),
    ).fetchone()

    if row is None:
        return None

    geometry = normalize_waypoints(json.loads(zlib.decompress(row[0]).decode("utf-8")))
    if start_key != first_key:
        geometry.reverse()

    return {
        "geometry": geometry,
        "distance_km": float(row[1]),
        "duration_min": int(row[2]),
    }


def coordinate_key(coordinate: Coordinate) -> str:
    return f"{coordinate[0]:.{KEY_PRECISION}f},{coordinate[1]:.{KEY_PRECISION}f}"


def normalize_waypoints(raw_waypoints: Iterable[Iterable[float]]) -> list[Coordinate]:
    waypoints: list[Coordinate] = []

    for raw in raw_waypoints or []:
        values = list(raw)
        if len(values) < 2:
            continue

        lng = float(values[0])
        lat = float(values[1])
        waypoints.append((lng, lat))

    return waypoints


def append_coordinates(target: list[Coordinate], coordinates: list[Coordinate]) -> None:
    for coordinate in coordinates:
        if not target or coordinate_key(target[-1]) != coordinate_key(coordinate):
            target.append(coordinate)
