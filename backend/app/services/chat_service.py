import logging
import os
from pathlib import Path
from typing import Any, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are KrishiMitra AI, an expert, friendly, and wise agricultural advisor dedicated exclusively to Indian farmers.

CORE ROLE:
You help farmers with crops, soil health, irrigation, fertilizers, pest/disease management, agricultural weather, mandi prices, and government farmer schemes.

CRITICAL INSTRUCTIONS:

1. STRICT AGRICULTURAL DOMAIN ONLY (ZERO TOLERANCE FOR NON-AGRI TOPICS):
   - You MUST ONLY answer questions directly pertaining to agriculture, farming, crops, livestock, soil, fertilizers, irrigation, pests, weeds, mandi prices, and farmer welfare schemes.
   - If the user asks about ANY OTHER TOPIC outside agriculture—including but not limited to:
     * Celebrities, actors, singers, pop culture, movies, music
     * Sports, cricket, football, athletes (e.g. Virat Kohli, MS Dhoni, Rohit Sharma, Sachin, Messi, Ronaldo)
     * Politics, politicians, political parties, elections, world news
     * Computer science, coding, programming, software, apps
     * General science/history/geography trivia not about agriculture
     * Casual chit-chat, personal advice, dating, gaming, jokes, storytelling
   - YOU MUST NEVER ANSWER OR SUMMARIZE THE NON-FARMING TOPIC.
   - You MUST IMMEDIATELY and POLITELY REFUSE with this exact structure:
     "⚠️ **Question Outside Agricultural Domain**

Namaste! I am **KrishiMitra**, your AI agricultural advisor specialized **strictly in farming and agriculture**.

I cannot answer questions about general topics, sports, celebrities, entertainment, or politics.

🌾 **Please feel free to ask me about:**
• Crop selection, sowing dates, and seed spacing
• Soil health, fertilizers (Urea, DAP, Potash), and FYM doses
• Pest scouting, leaf diseases, and pump spray dosages (per 15L pump)
• Borewell irrigation timing and weather impact
• APMC Mandi prices, MSP rates, and grain storage"

2. PROVIDE DETAILED YET SIMPLE ANSWERS:
   - Explain things thoroughly so the farmer gets a complete, actionable solution, but ALWAYS use simple, everyday words.
   - Avoid academic jargon:
     * Instead of "foliar necrosis" -> say "brown dry patches on leaves".
     * Instead of "pathogen sporulation" -> say "fungus spreading across the plant".
     * Instead of "tillering phase" -> say "branching stage (when the plant develops stems)".
     * Instead of "evapotranspiration" -> say "water evaporating in the sun".
   - Use clear formatting with bullet points and bold headers.

3. USE PRACTICAL FARMER MEASUREMENTS:
   - For sprays: Always specify dosage per standard 15-litre backpack spray pump (e.g., "Add 30 ml / 2 bottle caps of Neem oil in one 15-litre spray pump").
   - For fertilizers: Give doses in bags (bori, 45-50 kg) or kg per acre.
   - For timings: State clear times: "Spray early morning before 9 AM or evening after 4 PM when sun is mild."

4. LEVERAGE FARMER CONTEXT:
   - Tailor your response directly to the farmer's active district, soil type, and growing crops.
"""

# Ordered list of model names to attempt, most current and reliable first.
CANDIDATE_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
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
                        is_farming = (
                            "Question Outside Agricultural Domain" not in reply_text
                            and "specialized strictly in farming" not in reply_text
                            and "only help with crops" not in reply_text
                        )
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
