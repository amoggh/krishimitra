"""KrishiMitra API. Run from server/:  uvicorn app.main:app --port 8000"""
from __future__ import annotations

import json
import math
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import settings
from app.services import disease, forecast, llm, mandi, planner, yield_model
from app.services.knowledge import crop_by_id, districts

app = FastAPI(title="KrishiMitra API", version="2.0")


@app.on_event("startup")
def _warm_up():
    """Load models and fetch today's prices in the background so the first request is fast."""
    import threading
    def go():
        for f in (lambda: yield_model.predict("Mysuru", ["maize"], "kharif"), lambda: mandi.live("Karnataka"), disease._model):
            try:
                f()
            except Exception:
                pass
    threading.Thread(target=go, daemon=True).start()
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])


class PlanIn(BaseModel):
    district: str
    acres: float = Field(gt=0, le=200)
    budget: float = Field(ge=0, le=1e8)
    source: Literal["rainfed", "borewell", "canal"]
    hp: float = 5
    hours: float = Field(6, ge=0, le=24)
    depthFt: float = 0
    irrigation: Literal["drip", "sprinkler", "flood"] = "flood"
    experience: Literal["none", "some", "pro"] = "none"
    season: Literal["kharif", "rabi", "summer"]


class ChatIn(BaseModel):
    messages: list[dict]
    context: dict = {}


@app.get("/api/health")
def health():
    return {"ok": True, "models": {
        "yield": {"ready": yield_model.available(), "metrics": yield_model.metrics()},
        "price": forecast.status(),
        "disease": disease.info(),
        "chat": {"ready": settings.llm_ready, "model": settings.llm_model or None},
        "mandiKey": "own" if settings.has_own_data_gov_key else "public demo key (10 rows per call)",
    }}


@app.post("/api/plan")
def make_plan(inp: PlanIn):
    if inp.district not in districts():
        raise HTTPException(400, f"Unknown district {inp.district}")
    inp.acres = round(inp.acres * 4) / 4 or 0.25
    return planner.plan(inp.model_dump())


@app.post("/api/disease")
async def diagnose(image: UploadFile = File(...), crop: str | None = Form(None)):
    data = await image.read()
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(413, "Image larger than 12 MB")
    try:
        return disease.predict(data, crop)
    except Exception as e:
        raise HTTPException(422, f"Could not read that image: {e}")


@app.get("/api/disease/info")
def disease_info():
    return disease.info()


@app.get("/api/mandi/live")
def mandi_live(state: str = "Karnataka"):
    return mandi.live(state)


@app.get("/api/forecast/{crop}")
def price_forecast(crop: str):
    if crop not in crop_by_id():
        raise HTTPException(404, "Unknown crop")
    f = forecast.forecast(crop)
    if not f:
        raise HTTPException(404, f"No price model for {crop} yet")
    return f


@app.get("/api/forecast")
def forecast_overview():
    return {"status": forecast.status(), "seasonality": forecast.seasonality(), "metrics": forecast.metrics()}


@app.post("/api/chat")
def chat(body: ChatIn):
    if not settings.llm_ready:
        raise HTTPException(503, "The AI assistant is not configured. Add LLM_BASE_URL, LLM_MODEL and LLM_API_KEY to server/.env.")

    def gen():
        try:
            for chunk in llm.stream_chat(body.messages, body.context):
                yield chunk
        except Exception as e:
            yield f"\n\n[Assistant unavailable: {e}]"
    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")


# Serve the built React app (npm run build) so the demo is a single process.
if (settings.dist_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=settings.dist_dir / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = settings.dist_dir / path
        return FileResponse(f if path and f.is_file() else settings.dist_dir / "index.html")
