import logging
import os
from pathlib import Path
from typing import Any, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are KrishiMitra AI, a friendly and wise agricultural advisor helping Indian farmers.

IMPORTANT LANGUAGE & SIMPLICITY RULES:
1. TALK IN VERY SIMPLE WORDS:
   - Write in simple, easy-to-understand English (suitable for a farmer with basic schooling).
   - NEVER use complicated college-level scientific words or medical/botanical jargon.
   - Do NOT say "foliar necrosis" -> say "brown dry leaves".
   - Do NOT say "sporulation / pathogen" -> say "fungus or germ spreading".
   - Do NOT say "tillering / vegetative phase" -> say "branching stage (when plant is growing leaves)".
   - Do NOT say "evapotranspiration" -> say "water drying up in the heat".
   - Keep sentences short, direct, and warm.

2. USE PRACTICAL FARMER MEASUREMENTS:
   - When giving spray doses, ALWAYS mention the standard 15-litre sprayer pump (e.g., "Add 2 bottle caps / 30 ml in one 15-litre spray pump").
   - For fertilizers, mention bags (bori) or kg per acre (e.g., "1 bag of 45 kg Urea per acre").
   - Mention clear clock timings: "Early morning before 9 AM or evening after 4 PM".

3. ALWAYS EXPLAIN FERTILIZERS & MEDICINES SIMPLY:
   - Urea = White fertilizer for fast green leaf growth.
   - DAP = Black granules for strong roots.
   - Potash = For good grain weight and disease strength.
   - Neem oil = Natural herbal spray for small insects and worms.

4. STRICT DOMAIN BOUNDARY (FARMING ONLY):
   - You ONLY answer questions about crops, soil, water, fertilizers, pests, weather for farming, mandi prices, farm animals, and government farmer schemes.
   - If the user asks about ANYTHING ELSE (movies, politics, coding, games, personal chat), politely decline:
     "I am KrishiMitra, your farm assistant. I only help with crops, soil, pests, and farm work. Please ask me any farming question!"

5. USE FARM CONTEXT:
   - Tailor your simple advice directly to the user's district, soil type, and active crops.
"""

# Ordered list of model names to attempt, most current first.
# Google may retire older models for new API keys; we fall through the list automatically.
CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
]

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class ChatService:
    def __init__(self):
        self._working_model: Optional[str] = None

    def _get_api_key(self) -> str:
        """Read API key from environment, settings, or .env file directly."""
        key = os.getenv("GEMINI_API_KEY", "")
        if not key:
            key = getattr(settings, "gemini_api_key", "")
        if not key:
            env_file = Path(__file__).resolve().parent.parent.parent / ".env"
            if env_file.exists():
                try:
                    for line in env_file.read_text(encoding="utf-8").splitlines():
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                            key = line.split("=", 1)[1]
                            break
                except Exception:
                    pass
        return (key or "").strip().strip('"').strip("'")

    def _build_context_summary(self, farm_context: Optional[dict[str, Any]]) -> str:
        if not farm_context:
            return ""
        details = []
        loc = farm_context.get("district") or farm_context.get("location")
        if loc:
            state = farm_context.get("state", "")
            details.append(f"- Location: {loc}" + (f", {state}" if state else ""))
        if farm_context.get("soil_type"):
            details.append(f"- Soil Type: {farm_context['soil_type']}")
        if farm_context.get("total_acres"):
            details.append(f"- Total Land: {farm_context['total_acres']} acres")
        if farm_context.get("current_crops"):
            crops = farm_context["current_crops"]
            details.append(f"- Active Crops: {', '.join(crops) if isinstance(crops, list) else crops}")
        if farm_context.get("irrigation_type"):
            details.append(f"- Irrigation: {farm_context['irrigation_type']}")
        if farm_context.get("recent_weather"):
            w = farm_context["recent_weather"]
            details.append(f"- Current Weather: {w.get('temp_c', 'N/A')}°C, {w.get('condition', 'N/A')}")
        if not details:
            return ""
        return "\n[FARMER PROFILE]:\n" + "\n".join(details) + "\n"

    async def get_response(
        self,
        message: str,
        history: Optional[list[dict[str, str]]] = None,
        farm_context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        api_key = self._get_api_key()
        if not api_key:
            return {
                "response": (
                    "⚠️ **Gemini API Key Not Found**\n\n"
                    "Please add `GEMINI_API_KEY=your_key` to `backend/.env` and restart the server.\n"
                    "Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)."
                ),
                "is_farming_related": True,
                "suggested_followups": [],
            }

        # Build conversation payload
        context_summary = self._build_context_summary(farm_context)
        contents = []
        if history:
            for item in history:
                role = "user" if item.get("role") in ("user", "human") else "model"
                text = item.get("content", "")
                if text:
                    contents.append({"role": role, "parts": [{"text": text}]})

        augmented_prompt = message
        if context_summary:
            augmented_prompt = f"{context_summary}\nFarmer Question: {message}"
        contents.append({"role": "user", "parts": [{"text": augmented_prompt}]})

        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.25,
                "topP": 0.8,
                "maxOutputTokens": 1024,
            },
        }

        # Build ordered list: try last working model first, then fall through candidates
        models_to_try = []
        if self._working_model:
            models_to_try.append(self._working_model)
        for m in CANDIDATE_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for model in models_to_try:
                    url = f"{API_BASE}/{model}:generateContent?key={api_key}"
                    res = await client.post(
                        url,
                        json=payload,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": api_key,
                        },
                    )

                    if res.status_code == 200:
                        self._working_model = model
                        logger.info(f"KrishiMitra AI using model: {model}")
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            return {
                                "response": "No response generated. Please rephrase your farming question.",
                                "is_farming_related": True,
                                "suggested_followups": [],
                            }
                        parts = candidates[0].get("content", {}).get("parts", [])
                        reply_text = "".join(p.get("text", "") for p in parts).strip()
                        is_farming = "I am specialized only in farming" not in reply_text
                        return {
                            "response": reply_text,
                            "is_farming_related": is_farming,
                            "suggested_followups": [
                                "What is the best irrigation timing for this?",
                                "Recommended organic pesticide alternative?",
                                "Estimated cost per acre for this practice?"
                            ] if is_farming else [],
                        }

                    elif res.status_code == 404:
                        # This model not available for this key/project - try next
                        logger.warning(f"Model '{model}' not found (404), trying next...")
                        continue

                    elif res.status_code in (401, 403):
                        # Auth error - no point trying other models
                        logger.error(f"Gemini auth error {res.status_code}: {res.text}")
                        return {
                            "response": (
                                f"⚠️ **Invalid API Key ({res.status_code})**\n\n"
                                "Your Gemini API key was rejected. Please ensure:\n"
                                "- The key in `backend/.env` starts with `AIzaSy...`\n"
                                "- Get a valid key at [Google AI Studio](https://aistudio.google.com/app/apikey)"
                            ),
                            "is_farming_related": True,
                            "suggested_followups": [],
                        }

                    else:
                        logger.error(f"Model '{model}' error {res.status_code}: {res.text[:200]}")
                        # Try next model for any other error too
                        continue

                # All models exhausted
                return {
                    "response": (
                        "⚠️ **No Available Gemini Models Found**\n\n"
                        "None of the Gemini models could be reached with your API key.\n"
                        "Please verify your key at [Google AI Studio](https://aistudio.google.com/app/apikey) "
                        "and ensure the Generative Language API is enabled."
                    ),
                    "is_farming_related": True,
                    "suggested_followups": [],
                }

        except httpx.RequestError as exc:
            logger.error(f"Network error calling Gemini: {exc}")
            return {
                "response": "Network error reaching KrishiMitra AI. Please check your internet connection.",
                "is_farming_related": True,
                "suggested_followups": [],
            }
        except Exception as exc:
            logger.error(f"Unexpected chat service error: {exc}", exc_info=True)
            return {
                "response": "An unexpected error occurred. Please try again.",
                "is_farming_related": True,
                "suggested_followups": [],
            }


chat_service = ChatService()
