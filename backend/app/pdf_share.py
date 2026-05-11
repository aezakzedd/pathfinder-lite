"""In-memory QR share sessions for generated Pathfinder Lite PDFs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from io import BytesIO
import html
import os
import secrets

import qrcode
import qrcode.image.svg


SHARE_TTL_MINUTES = 60


@dataclass
class ShareSession:
    share_id: str
    pdf_id: str
    created_at: datetime
    expires_at: datetime


_shares: dict[str, ShareSession] = {}
_pdf_to_share: dict[str, str] = {}


import socket

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def get_share_base_url(request) -> str:
    """Return public base URL for QR links.

    Automatically resolves LAN IP if running on localhost so the QR code
    is functional for mobile phones.
    """
    configured = os.getenv("PATHFINDER_SHARE_BASE_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    base_url = str(request.base_url)
    if "localhost" in base_url or "127.0.0.1" in base_url:
        lan_ip = get_lan_ip()
        base_url = base_url.replace("localhost", lan_ip).replace("127.0.0.1", lan_ip)
    return base_url.rstrip("/")


def create_or_reuse_share(pdf_id: str, base_url: str) -> dict:
    """Create or reuse an unexpired share session for a PDF."""
    cleanup_expired_shares()

    existing_share_id = _pdf_to_share.get(pdf_id)
    existing = _shares.get(existing_share_id or "")
    if existing and not is_expired(existing):
        return build_share_response(existing, base_url)

    share = ShareSession(
        share_id=generate_share_id(),
        pdf_id=pdf_id,
        created_at=now_utc(),
        expires_at=now_utc() + timedelta(minutes=SHARE_TTL_MINUTES),
    )
    _shares[share.share_id] = share
    _pdf_to_share[pdf_id] = share.share_id
    return build_share_response(share, base_url)


def get_share(share_id: str) -> ShareSession | None:
    share = _shares.get(share_id)
    if not share:
        return None
    if is_expired(share):
        remove_share(share.share_id)
        return None
    return share


def invalidate_pdf_share(pdf_id: str | None) -> bool:
    if not pdf_id:
        return False
    share_id = _pdf_to_share.pop(pdf_id, None)
    if share_id and share_id in _shares:
        del _shares[share_id]
        return True
    return False


def cleanup_expired_shares() -> int:
    expired_ids = [
        share_id for share_id, share in _shares.items()
        if is_expired(share)
    ]
    for share_id in expired_ids:
        remove_share(share_id)
    return len(expired_ids)


def build_mobile_share_page(share_id: str, base_url: str) -> str:
    safe_pdf_url = html.escape(build_pdf_share_url(base_url, share_id), quote=True)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pathfinder Itinerary</title>
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
      width: min(440px, 100%);
      padding: 26px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 22px;
      background: #0b1220;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
    }}
    h1 {{ margin: 0 0 10px; font-size: 28px; line-height: 1.1; }}
    p {{ margin: 0 0 20px; color: #cbd5e1; line-height: 1.55; }}
    a {{
      display: inline-flex;
      min-height: 48px;
      align-items: center;
      justify-content: center;
      width: 100%;
      border-radius: 14px;
      background: #10b981;
      color: #04130d;
      font-weight: 800;
      text-decoration: none;
    }}
    small {{ display: block; margin-top: 16px; color: #94a3b8; line-height: 1.45; }}
  </style>
</head>
<body>
  <main>
    <h1>Pathfinder Itinerary</h1>
    <p>Your generated Catanduanes itinerary is ready.</p>
    <a href="{safe_pdf_url}">Open PDF</a>
    <small>Keep your phone connected to the same Wi-Fi/hotspot as the kiosk.</small>
  </main>
</body>
</html>"""


def build_share_error_page(message: str) -> str:
    safe_message = html.escape(message)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pathfinder Itinerary Unavailable</title>
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
    <h1>Itinerary unavailable</h1>
    <p>{safe_message}</p>
  </main>
</body>
</html>"""


def build_share_response(share: ShareSession, base_url: str) -> dict:
    share_url = build_share_url(base_url, share.share_id)
    pdf_url = build_pdf_share_url(base_url, share.share_id)
    return {
        "share_id": share.share_id,
        "share_url": share_url,
        "pdf_url": pdf_url,
        "qr_svg": generate_qr_svg(share_url),
        "expires_in_minutes": SHARE_TTL_MINUTES,
    }


def build_share_url(base_url: str, share_id: str) -> str:
    return f"{base_url}/s/{share_id}"


def build_pdf_share_url(base_url: str, share_id: str) -> str:
    return f"{base_url}/api/pdf-share/{share_id}.pdf"


def generate_qr_svg(value: str) -> str:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(value)
    qr.make(fit=True)
    image = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    buffer = BytesIO()
    image.save(buffer)
    svg = buffer.getvalue().decode("utf-8").strip()
    if svg.startswith("<?xml") and "?>" in svg:
        svg = svg.split("?>", 1)[1].strip()
        
    return svg


def generate_share_id() -> str:
    while True:
        share_id = secrets.token_urlsafe(9)
        if share_id not in _shares:
            return share_id


def remove_share(share_id: str) -> None:
    share = _shares.pop(share_id, None)
    if share and _pdf_to_share.get(share.pdf_id) == share_id:
        _pdf_to_share.pop(share.pdf_id, None)


def is_expired(share: ShareSession) -> bool:
    return share.expires_at <= now_utc()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
