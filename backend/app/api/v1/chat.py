from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])


class ChatHistoryItem(BaseModel):
    role: str = Field(description="'user' or 'model'")
    content: str


class FarmContextPayload(BaseModel):
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    soil_type: Optional[str] = None
    total_acres: Optional[float] = None
    current_crops: Optional[list[str]] = None
    irrigation_type: Optional[str] = None
    recent_weather: Optional[dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Farmer query")
    history: Optional[list[ChatHistoryItem]] = Field(default_factory=list)
    farm_context: Optional[FarmContextPayload] = None


class ChatResponse(BaseModel):
    response: str
    is_farming_related: bool = True
    suggested_followups: list[str] = Field(default_factory=list)


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(payload: ChatRequest):
    """
    Precision Farming Chatbot powered by Google Gemini.
    Strictly answers agricultural & farm-specific questions with context injection.
    """
    history_dicts = [item.model_dump() for item in payload.history] if payload.history else []
    context_dict = payload.farm_context.model_dump() if payload.farm_context else None

    result = await chat_service.get_response(
        message=payload.message,
        history=history_dicts,
        farm_context=context_dict,
    )
    return ChatResponse(**result)


@router.get("/status")
async def chat_status():
    """
    Returns AI Chatbot status and configuration flag.
    """
    api_key = chat_service._get_api_key()
    return {
        "status": "ready",
        "has_api_key": bool(api_key),
        "key_prefix": api_key[:6] + "..." if len(api_key) > 6 else "",
        "model": chat_service._working_model or "gemini-2.5-flash / gemini-2.0-flash",
        "domain": "agriculture_only",
    }

