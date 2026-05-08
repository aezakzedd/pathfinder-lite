"""In-memory map link registry for Google Maps directions launcher pages."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import html
import os
import secrets


MAP_LINK_TTL_MINUTES = 60


@dataclass
class MapLink:
    map_link_id: str
    pdf_id: str
    google_maps_url: str
    created_at: datetime
    expires_at: datetime


_map_links: dict[str, MapLink] = {}
_pdf_to_map_links: dict[str, list[str]] = {}


def get_map_link_base_url(request) -> str:
    """Return public base URL for map launcher links.

    PATHFINDER_SHARE_BASE_URL should be set to the Raspberry Pi LAN/hotspot IP
    in kiosk mode. request.base_url is a useful dev fallback, but localhost
    links will not open from a phone.
    """
    configured = os.getenv("PATHFINDER_SHARE_BASE_URL", "").strip()
    base_url = configured or str(request.base_url)
    return base_url.rstrip("/")


def create_map_link(pdf_id: str, google_maps_url: str) -> str:
    """Create a map link for a PDF day route."""
    cleanup_expired_map_links()

    map_link = MapLink(
        map_link_id=generate_map_link_id(),
        pdf_id=pdf_id,
        google_maps_url=google_maps_url,
        created_at=now_utc(),
        expires_at=now_utc() + timedelta(minutes=MAP_LINK_TTL_MINUTES),
    )
    _map_links[map_link.map_link_id] = map_link

    if pdf_id not in _pdf_to_map_links:
        _pdf_to_map_links[pdf_id] = []
    _pdf_to_map_links[pdf_id].append(map_link.map_link_id)

    return map_link.map_link_id


def get_map_link(map_link_id: str) -> MapLink | None:
    map_link = _map_links.get(map_link_id)
    if not map_link:
        return None
    if is_expired(map_link):
        remove_map_link(map_link.map_link_id)
        return None
    return map_link


def invalidate_pdf_map_links(pdf_id: str | None) -> int:
    """Invalidate all map links for a PDF. Returns count of invalidated links."""
    if not pdf_id:
        return 0

    link_ids = _pdf_to_map_links.pop(pdf_id, [])
    count = 0
    for link_id in link_ids:
        if link_id in _map_links:
            del _map_links[link_id]
            count += 1
    return count


def cleanup_expired_map_links() -> int:
    expired_ids = [
        link_id for link_id, link in _map_links.items()
        if is_expired(link)
    ]
    for link_id in expired_ids:
        remove_map_link(link_id)
    return len(expired_ids)


def build_launcher_page(map_link: MapLink, base_url: str) -> str:
    """Build the lightweight HTML launcher page for Google Maps directions."""
    safe_google_maps_url = html.escape(map_link.google_maps_url, quote=True)
    safe_pdf_url = html.escape(build_pdf_return_url(base_url, map_link.pdf_id), quote=True)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pathfinder Directions</title>
  <style>
    :root {{ color-scheme: dark; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #05070b;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }}
    main {{
      width: min(480px, 100%);
      padding: 28px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 22px;
      background: #0b1220;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
    }}
    h1 {{ margin: 0 0 12px; font-size: 26px; line-height: 1.1; }}
    p {{ margin: 0 0 24px; color: #cbd5e1; line-height: 1.55; }}
    .primary {{
      display: inline-flex;
      min-height: 52px;
      align-items: center;
      justify-content: center;
      width: 100%;
      border-radius: 14px;
      background: #2563eb;
      color: #f8fafc;
      font-weight: 800;
      text-decoration: none;
      margin-bottom: 12px;
    }}
    .secondary {{
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      width: 100%;
      border-radius: 12px;
      background: #1f2937;
      color: #cbd5e1;
      font-weight: 700;
      text-decoration: none;
      border: 1px solid rgba(148, 163, 184, 0.24);
    }}
    .primary:hover {{ background: #1d4ed8; }}
    .secondary:hover {{ background: #273244; border-color: rgba(226, 232, 240, 0.42); }}
  </style>
</head>
<body>
  <main>
    <h1>Pathfinder Directions</h1>
    <p>Open this day route in Google Maps.</p>
    <a href="{safe_google_maps_url}" target="_blank" rel="noopener noreferrer" class="primary">Open Google Maps</a>
    <a href="{safe_pdf_url}" class="secondary">Return to PDF</a>
  </main>
</body>
</html>"""


def build_launcher_error_page(message: str) -> str:
    """Build an error page for expired or missing map links."""
    safe_message = html.escape(message)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pathfinder Directions Unavailable</title>
  <style>
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #05070b;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }}
    main {{
      width: min(420px, 100%);
      padding: 24px;
      border-radius: 18px;
      background: #111827;
      border: 1px solid rgba(248, 113, 113, 0.3);
    }}
    h1 {{ margin: 0 0 10px; font-size: 24px; }}
    p {{ margin: 0; color: #fecaca; line-height: 1.5; }}
  </style>
</head>
<body>
  <main>
    <h1>Directions unavailable</h1>
    <p>{safe_message}</p>
  </main>
</body>
</html>"""


def build_map_link_url(base_url: str, map_link_id: str) -> str:
    """Build the launcher URL for a map link."""
    return f"{base_url}/m/{map_link_id}"


def build_pdf_return_url(base_url: str, pdf_id: str) -> str:
    """Build the PDF return URL with toolbar-hiding fragment."""
    return f"{base_url}/api/pdf/{pdf_id}.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH"


def generate_map_link_id() -> str:
    """Generate a unique short map link ID."""
    while True:
        map_link_id = secrets.token_urlsafe(9)
        if map_link_id not in _map_links:
            return map_link_id


def remove_map_link(map_link_id: str) -> None:
    """Remove a map link from the registry."""
    map_link = _map_links.pop(map_link_id, None)
    if map_link:
        link_ids = _pdf_to_map_links.get(map_link.pdf_id, [])
        if map_link_id in link_ids:
            link_ids.remove(map_link_id)
            if not link_ids:
                _pdf_to_map_links.pop(map_link.pdf_id, None)


def is_expired(map_link: MapLink) -> bool:
    """Check if a map link has expired."""
    return map_link.expires_at <= now_utc()


def now_utc() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)
