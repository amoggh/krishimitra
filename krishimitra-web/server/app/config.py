"""Runtime settings, read from environment variables or server/.env."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # server/
PROJECT = ROOT.parent                                # krishimitra-web/
HTTP_HEADERS = {"User-Agent": "KrishiMitra/1.0 (farm planning app)", "Accept": "application/json"}
PUBLIC_DATA_GOV_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"  # data.gov.in's published demo key


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv(ROOT / ".env")


class Settings:
    data_dir = ROOT / "data"
    models_dir = ROOT / "models"
    shared_dir = PROJECT / "shared"
    dist_dir = PROJECT / "dist"

    data_gov_api_key = os.getenv("DATA_GOV_API_KEY") or PUBLIC_DATA_GOV_KEY
    has_own_data_gov_key = bool(os.getenv("DATA_GOV_API_KEY"))

    # Any OpenAI-compatible chat endpoint: Groq, OpenRouter, Together, Ollama, vLLM, LM Studio...
    llm_base_url = os.getenv("LLM_BASE_URL", "").rstrip("/")
    llm_api_key = os.getenv("LLM_API_KEY", "")
    llm_model = os.getenv("LLM_MODEL", "")

    live_cache_seconds = int(os.getenv("LIVE_CACHE_SECONDS", "1800"))
    cors_origins = [o for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o]

    @property
    def llm_ready(self) -> bool:
        return bool(self.llm_base_url and self.llm_model)


settings = Settings()
