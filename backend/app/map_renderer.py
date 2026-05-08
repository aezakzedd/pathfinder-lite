"""Backend route map image renderer using Pillow."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


# Known hub coordinates (lng, lat)
HUB_COORDINATES = {
    "Virac": [124.23, 13.58],
    "San Andres": [124.55, 13.60],
}

# Image dimensions
MAP_WIDTH = 794  # A4 width in points (approx 210mm)
MAP_HEIGHT = 200  # Reasonable height for map placeholder

# Colors
COLOR_WATER = (15, 23, 42)  # Dark navy
COLOR_LAND = (148, 163, 184)  # Light gray
COLOR_ROUTE = (37, 99, 235)  # Blue
COLOR_STOP = (16, 185, 129)  # Green
COLOR_START = (234, 179, 8)  # Yellow
COLOR_END = (220, 38, 38)  # Red


def extract_coordinates(stop: dict[str, Any]) -> tuple[float, float] | None:
    """Extract coordinates from a stop dict in various formats."""
    # Try stop.coordinates = [lng, lat]
    if "coordinates" in stop and stop["coordinates"]:
        coords = stop["coordinates"]
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            return float(coords[0]), float(coords[1])

    # Try stop.geometry.coordinates = [lng, lat]
    if "geometry" in stop and isinstance(stop["geometry"], dict):
        geom_coords = stop["geometry"].get("coordinates")
        if geom_coords and isinstance(geom_coords, (list, tuple)) and len(geom_coords) >= 2:
            return float(geom_coords[0]), float(geom_coords[1])

    # Try stop.lng / stop.lat
    if "lng" in stop and "lat" in stop:
        return float(stop["lng"]), float(stop["lat"])

    # Try stop.longitude / stop.latitude
    if "longitude" in stop and "latitude" in stop:
        return float(stop["longitude"]), float(stop["latitude"])

    # Try stop.lon / stop.lat
    if "lon" in stop and "lat" in stop:
        return float(stop["lon"]), float(stop["lat"])

    return None


def get_hub_coordinates(hub_name: str) -> tuple[float, float] | None:
    """Get coordinates for a known hub."""
    hub_name = hub_name.strip()
    if hub_name in HUB_COORDINATES:
        coords = HUB_COORDINATES[hub_name]
        return float(coords[0]), float(coords[1])
    return None


def fit_coordinates_to_bounds(
    coordinates: list[tuple[float, float]],
    padding: float = 0.1,
) -> tuple[float, float, float, float]:
    """Fit coordinates into normalized bounds [0, 1] with padding."""
    if not coordinates:
        return 0, 0, 1, 1

    lngs = [c[0] for c in coordinates]
    lats = [c[1] for c in coordinates]

    min_lng, max_lng = min(lngs), max(lngs)
    min_lat, max_lat = min(lats), max(lats)

    lng_range = max_lng - min_lng or 1
    lat_range = max_lat - min_lat or 1

    # Add padding
    min_lng -= lng_range * padding
    max_lng += lng_range * padding
    min_lat -= lat_range * padding
    max_lat += lat_range * padding

    lng_range = max_lng - min_lng or 1
    lat_range = max_lat - min_lat or 1

    return min_lng, min_lat, lng_range, lat_range


def normalize_coordinate(
    coord: tuple[float, float],
    bounds: tuple[float, float, float, float],
) -> tuple[float, float]:
    """Normalize a coordinate to [0, 1] range."""
    lng, lat = coord
    min_lng, min_lat, lng_range, lat_range = bounds

    norm_x = (lng - min_lng) / lng_range if lng_range > 0 else 0.5
    norm_y = (lat - min_lat) / lat_range if lat_range > 0 else 0.5

    return norm_x, norm_y


def denormalize_coordinate(
    norm_coord: tuple[float, float],
    bounds: tuple[float, float, float, float],
    width: int,
    height: int,
) -> tuple[int, int]:
    """Convert normalized coordinate to pixel position."""
    norm_x, norm_y = norm_coord
    x = int(norm_x * width)
    y = int(norm_y * height)
    return x, y


def draw_route_map(
    coordinates: list[tuple[float, float]],
    width: int = MAP_WIDTH,
    height: int = MAP_HEIGHT,
) -> Image.Image:
    """Draw a route map image from coordinates."""
    # Create image with dark water background
    img = Image.new("RGB", (width, height), COLOR_WATER)
    draw = ImageDraw.Draw(img)

    if len(coordinates) < 2:
        # Fallback: draw simple placeholder
        draw.rectangle([10, 10, width - 10, height - 10], outline=COLOR_LAND, width=2)
        return img

    # Fit coordinates to bounds
    bounds = fit_coordinates_to_bounds(coordinates, padding=0.15)

    # Normalize coordinates
    norm_coords = [normalize_coordinate(c, bounds) for c in coordinates]

    # Convert to pixel coordinates
    pixel_coords = [denormalize_coordinate(c, bounds, width, height) for c in norm_coords]

    # Draw land-like background (subtle gray fill)
    if len(pixel_coords) >= 3:
        draw.polygon(pixel_coords, fill=COLOR_LAND)

    # Draw route line
    if len(pixel_coords) >= 2:
        draw.line(pixel_coords, fill=COLOR_ROUTE, width=3)

    # Draw stop points
    for i, (x, y) in enumerate(pixel_coords):
        if i == 0:
            color = COLOR_START
            radius = 6
        elif i == len(pixel_coords) - 1:
            color = COLOR_END
            radius = 6
        else:
            color = COLOR_STOP
            radius = 4

        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)

    return img


def generate_route_map_image(stops: list[dict[str, Any]], start_label: str = "") -> bytes:
    """Generate a PNG route map image from stops and start label."""
    coordinates = []

    # Add start point if provided
    if start_label:
        hub_coords = get_hub_coordinates(start_label)
        if hub_coords:
            coordinates.append(hub_coords)

    # Extract coordinates from stops
    for stop in stops:
        coords = extract_coordinates(stop)
        if coords:
            coordinates.append(coords)

    # Draw route map
    img = draw_route_map(coordinates)

    # Convert to bytes
    from io import BytesIO
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_fallback_map_image() -> bytes:
    """Generate a fallback map image when coordinates are unavailable."""
    img = Image.new("RGB", (MAP_WIDTH, MAP_HEIGHT), COLOR_WATER)
    draw = ImageDraw.Draw(img)

    # Draw simple placeholder
    draw.rectangle([10, 10, MAP_WIDTH - 10, MAP_HEIGHT - 10], outline=COLOR_LAND, width=2)
    draw.text(
        (MAP_WIDTH // 2, MAP_HEIGHT // 2),
        "Map unavailable",
        fill=COLOR_LAND,
        anchor="mm",
    )

    from io import BytesIO
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
