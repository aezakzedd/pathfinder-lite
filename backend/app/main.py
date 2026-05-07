from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .routing import build_route_response


class RouteRequest(BaseModel):
    waypoints: list[list[float]]


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
