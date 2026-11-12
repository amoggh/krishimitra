from pathlib import Path
from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
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

    class Config:
        env_file = (_BACKEND_DIR / ".env", _ROOT_DIR / ".env", ".env")
        extra = "ignore"


settings = Settings()
