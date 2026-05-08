from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel

from .chatbot import answer_question
from .routing import build_route_response
from .pdf_generator import generate_itinerary_pdf
from .pdf_store import load_pdf, delete_pdf, pdf_exists
from .pdf_share import (
    build_mobile_share_page,
    build_share_error_page,
    cleanup_expired_shares,
    create_or_reuse_share,
    get_share,
    get_share_base_url,
    invalidate_pdf_share,
)
from .map_link import (
    build_launcher_error_page,
    build_launcher_page,
    build_map_link_url,
    cleanup_expired_map_links,
    get_map_link,
    get_map_link_base_url,
    invalidate_pdf_map_links,
)
from .dialogue_state import dialogue_store


class RouteRequest(BaseModel):
    waypoints: list[list[float]]


class AskRequest(BaseModel):
    question: str
    active_pin: dict | None = None
    session_id: str | None = None
    preferences: dict | None = None


class PdfGenerateRequest(BaseModel):
    days: dict
    totalStops: int
    dayCount: int
    dateRange: dict | None = None
    timeWallet: dict | None = None
    setup: dict | None = None
    routeSource: str | None = None


class SessionFinishRequest(BaseModel):
    pdf_id: str | None = None
    session_id: str | None = None


app = FastAPI(title="Pathfinder Lite Local API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:7321",
        "http://127.0.0.1:7321",
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "pathfinder-lite-backend"}


@app.post("/api/route")
def route(request: RouteRequest):
    try:
        return build_route_response(request.waypoints)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/ask")
def ask(request: AskRequest):
    return answer_question(
        request.question,
        active_pin=request.active_pin,
        session_id=request.session_id,
        preferences=request.preferences,
    )


@app.post("/api/pdf/generate")
def generate_pdf(request: PdfGenerateRequest, http_request: Request):
    try:
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        base_url = get_map_link_base_url(http_request)
        pdf_id, download_url = generate_itinerary_pdf(payload, base_url=base_url)
        return {
            "pdf_id": pdf_id,
            "download_url": download_url
        }
    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/api/pdf/{pdf_id}/share")
def share_pdf(pdf_id: str, request: Request):
    if not pdf_exists(pdf_id):
        raise HTTPException(status_code=404, detail="PDF not found")

    base_url = get_share_base_url(request)
    return create_or_reuse_share(pdf_id, base_url)


@app.get("/api/pdf/{pdf_id}.pdf")
def get_pdf(pdf_id: str, download: bool = False):
    pdf_bytes = load_pdf(pdf_id)
    if pdf_bytes is None:
        raise HTTPException(status_code=404, detail="PDF not found")

    disposition = "attachment" if download else "inline"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"{disposition}; filename=pathfinder-itinerary-{pdf_id}.pdf"}
    )


@app.delete("/api/pdf/{pdf_id}")
def delete_pdf_endpoint(pdf_id: str):
    if not pdf_exists(pdf_id):
        raise HTTPException(status_code=404, detail="PDF not found")

    deleted = delete_pdf(pdf_id)
    if deleted:
        invalidate_pdf_share(pdf_id)
        invalidate_pdf_map_links(pdf_id)
        return {"message": "PDF deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete PDF")


@app.get("/s/{share_id}", response_class=HTMLResponse)
def mobile_share_page(share_id: str, request: Request):
    cleanup_expired_shares()
    share = get_share(share_id)
    if not share or not pdf_exists(share.pdf_id):
        return HTMLResponse(
            content=build_share_error_page("This transfer link is expired or no longer available."),
            status_code=404,
        )

    base_url = get_share_base_url(request)
    return HTMLResponse(content=build_mobile_share_page(share_id, base_url))


@app.get("/m/{map_link_id}", response_class=HTMLResponse)
def map_launcher_page(map_link_id: str, request: Request):
    cleanup_expired_map_links()
    map_link = get_map_link(map_link_id)
    if not map_link or not pdf_exists(map_link.pdf_id):
        return HTMLResponse(
            content=build_launcher_error_page("This directions link is expired or no longer available."),
            status_code=404,
        )

    base_url = get_map_link_base_url(request)
    return HTMLResponse(content=build_launcher_page(map_link, base_url))


@app.get("/api/pdf-share/{share_id}.pdf")
def get_shared_pdf(share_id: str):
    share = get_share(share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    pdf_bytes = load_pdf(share.pdf_id)
    if pdf_bytes is None:
        invalidate_pdf_share(share.pdf_id)
        raise HTTPException(status_code=404, detail="PDF not found")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=pathfinder-itinerary.pdf"},
    )


@app.post("/api/session/finish")
def finish_session(request: SessionFinishRequest):
    deleted_pdf = False
    cleared_session = False

    # Delete PDF if provided
    if request.pdf_id:
        invalidate_pdf_share(request.pdf_id)
        invalidate_pdf_map_links(request.pdf_id)
        if pdf_exists(request.pdf_id):
            deleted = delete_pdf(request.pdf_id)
            deleted_pdf = deleted

    # Clear dialogue session if provided
    if request.session_id:
        try:
            # Remove the session from dialogue store
            if request.session_id in dialogue_store.sessions:
                del dialogue_store.sessions[request.session_id]
                cleared_session = True
        except Exception:
            # If session clearing fails, continue without error
            pass

    return {
        "ok": True,
        "deleted_pdf": deleted_pdf,
        "cleared_session": cleared_session
    }
