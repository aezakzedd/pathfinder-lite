from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .chatbot import answer_question
from .routing import build_route_response
from .pdf_generator import generate_itinerary_pdf
from .pdf_store import load_pdf, delete_pdf, pdf_exists
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
def generate_pdf(request: PdfGenerateRequest):
    try:
        payload = request.model_dump()
        pdf_id, download_url = generate_itinerary_pdf(payload)
        return {
            "pdf_id": pdf_id,
            "download_url": download_url
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/pdf/{pdf_id}.pdf")
def get_pdf(pdf_id: str):
    pdf_bytes = load_pdf(pdf_id)
    if pdf_bytes is None:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    from io import BytesIO
    from fastapi.responses import Response
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=pathfinder-itinerary-{pdf_id}.pdf"}
    )


@app.delete("/api/pdf/{pdf_id}")
def delete_pdf_endpoint(pdf_id: str):
    if not pdf_exists(pdf_id):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    deleted = delete_pdf(pdf_id)
    if deleted:
        return {"message": "PDF deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete PDF")


@app.post("/api/session/finish")
def finish_session(request: SessionFinishRequest):
    deleted_pdf = False
    cleared_session = False
    
    # Delete PDF if provided
    if request.pdf_id:
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
