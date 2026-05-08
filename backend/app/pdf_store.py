# PDF storage management for Pathfinder Lite
# Handles PDF file storage, retrieval, and cleanup

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional


# Directory for storing generated PDFs
PDF_STORAGE_DIR = Path(__file__).parent.parent / "data" / "generated_pdfs"

# Ensure storage directory exists
PDF_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def generate_pdf_id() -> str:
    """Generate a unique PDF ID."""
    return str(uuid.uuid4())


def get_pdf_path(pdf_id: str) -> Path:
    """Get the file path for a PDF ID."""
    return PDF_STORAGE_DIR / f"{pdf_id}.pdf"


def save_pdf(pdf_id: str, pdf_bytes: bytes) -> Path:
    """Save PDF bytes to storage directory."""
    pdf_path = get_pdf_path(pdf_id)
    pdf_path.write_bytes(pdf_bytes)
    return pdf_path


def load_pdf(pdf_id: str) -> Optional[bytes]:
    """Load PDF bytes from storage directory."""
    pdf_path = get_pdf_path(pdf_id)
    if pdf_path.exists():
        return pdf_path.read_bytes()
    return None


def delete_pdf(pdf_id: str) -> bool:
    """Delete a PDF from storage directory."""
    pdf_path = get_pdf_path(pdf_id)
    if pdf_path.exists():
        pdf_path.unlink()
        return True
    return False


def pdf_exists(pdf_id: str) -> bool:
    """Check if a PDF exists in storage."""
    return get_pdf_path(pdf_id).exists()


def get_pdf_size(pdf_id: str) -> Optional[int]:
    """Get PDF file size in bytes."""
    pdf_path = get_pdf_path(pdf_id)
    if pdf_path.exists():
        return pdf_path.stat().st_size
    return None


def cleanup_old_pdfs(max_age_hours: int = 24) -> int:
    """Delete PDFs older than max_age_hours. Returns count of deleted files."""
    deleted_count = 0
    cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
    
    for pdf_path in PDF_STORAGE_DIR.glob("*.pdf"):
        if pdf_path.stat().st_mtime < cutoff_time:
            pdf_path.unlink()
            deleted_count += 1
    
    return deleted_count


def get_pdf_count() -> int:
    """Get the total number of stored PDFs."""
    return len(list(PDF_STORAGE_DIR.glob("*.pdf")))
