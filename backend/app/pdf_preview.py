"""Backend PDF page image preview renderer using pypdfium2."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pypdfium2  # type: ignore

from .pdf_store import get_pdf_path


PREVIEWS_DIR = Path(__file__).parent.parent / "data" / "generated_pdfs" / "previews"


def get_page_number(path: Path) -> int:
    """Extract page number from filename like 'page-1.png'."""
    try:
        return int(path.stem.split("-")[1])
    except Exception:
        return 0


def ensure_previews_dir(pdf_id: str) -> Path:
    """Ensure the preview directory exists for a PDF."""
    pdf_preview_dir = PREVIEWS_DIR / pdf_id
    pdf_preview_dir.mkdir(parents=True, exist_ok=True)
    return pdf_preview_dir


def render_pdf_pages_to_images(pdf_id: str, scale: float = 2.0) -> dict[int, dict[str, Any]]:
    """Render PDF pages to PNG images and return page metadata."""
    pdf_path = get_pdf_path(pdf_id)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    pdf_preview_dir = ensure_previews_dir(pdf_id)
    pages_metadata = {}

    # Load PDF using pypdfium2
    pdf = pypdfium2.PdfDocument(str(pdf_path))
    page_count = len(pdf)

    for page_num in range(page_count):
        page = pdf[page_num]

        # Render page to PIL image
        pil_image = page.render(
            scale=scale,
            rotation=0,
        ).to_pil()

        # Save as PNG
        page_image_path = pdf_preview_dir / f"page-{page_num + 1}.png"
        pil_image.save(page_image_path, "PNG")

        # Store metadata
        pages_metadata[page_num + 1] = {
            "page": page_num + 1,
            "image_url": f"/api/pdf/{pdf_id}/preview/{page_num + 1}.png",
            "width": pil_image.width,
            "height": pil_image.height,
            "links": [],
        }

        page.close()

    pdf.close()

    return pages_metadata


def delete_preview_images(pdf_id: str) -> int:
    """Delete preview images for a PDF. Returns count of deleted files."""
    pdf_preview_dir = PREVIEWS_DIR / pdf_id
    if not pdf_preview_dir.exists():
        return 0

    count = 0
    for file_path in pdf_preview_dir.glob("*.png"):
        file_path.unlink()
        count += 1

    # Remove directory if empty
    try:
        pdf_preview_dir.rmdir()
    except OSError:
        pass

    return count


def get_preview_metadata(pdf_id: str) -> dict[str, Any] | None:
    """Get preview metadata for a PDF if it exists."""
    pdf_preview_dir = PREVIEWS_DIR / pdf_id
    if not pdf_preview_dir.exists():
        return None

    page_files = sorted(pdf_preview_dir.glob("page-*.png"), key=get_page_number)
    if not page_files:
        return None

    pages = []
    for page_file in page_files:
        page_num = int(page_file.stem.split("-")[1])
        from PIL import Image
        img = Image.open(page_file)
        pages.append({
            "page": page_num,
            "image_url": f"/api/pdf/{pdf_id}/preview/{page_num}.png",
            "width": img.width,
            "height": img.height,
            "links": [],
        })
        img.close()

    return {
        "pdf_id": pdf_id,
        "page_count": len(pages),
        "pages": pages,
    }


def add_map_link_overlay(
    pdf_id: str,
    page: int,
    map_link_id: str,
    x: float,
    y: float,
    w: float,
    h: float,
    label: str = "Open in Google Maps",
) -> None:
    """Add a map link overlay to preview metadata."""
    # This is a placeholder - in a real implementation, we'd store this in a separate registry
    # For now, we'll store it in a simple JSON file alongside the preview images
    metadata_path = PREVIEWS_DIR / pdf_id / "overlays.json"

    import json
    from pathlib import Path

    overlays = {}
    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            overlays = json.load(f)

    page_key = f"page-{page}"
    if page_key not in overlays:
        overlays[page_key] = []

    overlays[page_key].append({
        "type": "map",
        "href": f"/m/{map_link_id}",
        "target": "_blank",
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "label": label,
    })

    with open(metadata_path, "w") as f:
        json.dump(overlays, f)


def load_overlay_metadata(pdf_id: str) -> dict[str, Any]:
    """Load overlay metadata for a PDF."""
    metadata_path = PREVIEWS_DIR / pdf_id / "overlays.json"
    if not metadata_path.exists():
        return {}

    import json
    with open(metadata_path, "r") as f:
        return json.load(f)


def get_preview_with_overlays(pdf_id: str) -> dict[str, Any] | None:
    """Get preview metadata with overlays for a PDF."""
    preview_metadata = get_preview_metadata(pdf_id)
    if not preview_metadata:
        return None

    overlays = load_overlay_metadata(pdf_id)

    # Merge overlays into page metadata
    for page in preview_metadata["pages"]:
        page_key = f"page-{page['page']}"
        if page_key in overlays:
            page["links"] = overlays[page_key]

    return preview_metadata


def get_page_image_path(pdf_id: str, page: int) -> Path | None:
    """Get the file path for a page image."""
    page_image_path = PREVIEWS_DIR / pdf_id / f"page-{page}.png"
    if page_image_path.exists():
        return page_image_path
    return None
