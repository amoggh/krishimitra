"""
Farm assistant chat over any OpenAI-compatible endpoint (Groq, OpenRouter, Together, Ollama, vLLM...).
The answer is grounded in the app's own data: the farmer's plan, crop knowledge and today's mandi prices.
"""
from __future__ import annotations

import json
from typing import Iterator

import requests

from app.config import settings
from app.services import mandi
from app.services.knowledge import crop_by_id

SYSTEM = """You are KrishiMitra, a patient farming mentor for first-time farmers in Karnataka, India.
Rules:
- Answer in plain, short sentences. Use the farmer's language if they write in Kannada or Hindi.
- Prefer the FACTS block below over your general knowledge. If the facts do not cover a question, say so plainly.
- Never invent prices, subsidy amounts or chemical doses. For any pesticide, give the generic name and label dose only if
  it appears in the FACTS, and always tell the farmer to confirm with the local Raitha Samparka Kendra or KVK.
- Money: quote rupees per quintal or per acre. Remind them that prices change daily.
- If asked about something unrelated to farming, politely steer back.
"""


def _facts(context: dict) -> str:
    lines = []
    plan = context.get("plan")
    if plan:
        lines.append(f"Farmer: {plan.get('acres')} acres in {plan.get('district')}, season {plan.get('season')}, water {plan.get('source')}, experience {plan.get('experience')}, budget Rs {plan.get('budget')}.")
        for c in plan.get("crops", []):
            lines.append(f"Planned: {c['name']} on {c['acres']} acres; expected yield {c.get('yield')} q/acre; price used Rs {c.get('price')}/q ({c.get('priceSource')}).")
    ids = {c.get("id") for c in (plan or {}).get("crops", [])} | set(context.get("crops", []))
    kb = crop_by_id()
    for cid in sorted(i for i in ids if i in kb):
        c = kb[cid]
        steps = "; ".join(f"week {w}: {t} - {d}" for w, t, d in c["plan"])
        lines.append(f"Crop {c['name']}: {c['days']} days, water need {c['etc']} mm, seed {c['seed']}, cost about Rs {c['cost']}/acre, MSP {c.get('msp') or 'none'}. Calendar: {steps}")
    try:
        today = mandi.latest_crop_prices()
        if today:
            lines.append("Karnataka mandi modal prices (" + next(iter(today.values()))["source"] + "): " +
                         ", ".join(f"{k} Rs {round(v['modal'])}/q" for k, v in today.items()))
    except Exception:
        pass
    return "FACTS:\n" + "\n".join(lines) if lines else "FACTS: none provided."


def stream_chat(messages: list[dict], context: dict) -> Iterator[str]:
    """Yields text chunks. Raises RuntimeError if no model is configured."""
    if not settings.llm_ready:
        raise RuntimeError("No AI model configured. Set LLM_BASE_URL, LLM_MODEL and LLM_API_KEY in server/.env.")
    body = {"model": settings.llm_model, "stream": True, "temperature": 0.3, "max_tokens": 700,
            "messages": [{"role": "system", "content": SYSTEM + "\n" + _facts(context)}] +
                        [{"role": m["role"], "content": str(m["content"])[:4000]} for m in messages[-12:] if m.get("role") in ("user", "assistant")]}
    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
    with requests.post(f"{settings.llm_base_url}/chat/completions", json=body, headers=headers, stream=True, timeout=(10, 120)) as r:
        if r.status_code >= 400:
            raise RuntimeError(f"AI provider returned {r.status_code}: {r.text[:200]}")
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                delta = json.loads(data)["choices"][0].get("delta", {}).get("content")
            except (ValueError, KeyError, IndexError):
                continue
            if delta:
                yield delta
