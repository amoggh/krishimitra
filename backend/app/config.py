import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ROOT_DIR = _BACKEND_DIR.parent

# Explicitly load .env into os.environ
load_dotenv(_BACKEND_DIR / ".env", override=True)
load_dotenv(_ROOT_DIR / ".env", override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_BACKEND_DIR / ".env", _ROOT_DIR / ".env", ".env"),
        extra="ignore"
    )

    app_name: str = "KrushiMitra API"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]
    
    # Mandi Price API (data.gov.in AGMARKNET)
    data_gov_in_api_key: str = ""
    
    # Weather APIs
    openweather_api_key: str = ""
    weatherapi_key: str = ""
    
    # Google Maps API
    google_maps_api_key: str = ""

    # Google Gemini API
    gemini_api_key: str = ""


settings = Settings()
