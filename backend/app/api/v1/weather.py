from fastapi import APIRouter, Query
from app.services.weather_service import fetch_live_weather, WeatherData

router = APIRouter(prefix="/weather", tags=["weather"])

@router.get("/current", response_model=WeatherData)
async def get_current_weather(
    lat: float = Query(12.5218, description="Latitude of farm location"),
    lon: float = Query(76.8951, description="Longitude of farm location"),
    district: str = Query("Mandya", description="District or location name"),
) -> WeatherData:
    """
    Fetch real-time weather for farm coordinates.
    Uses OpenWeatherMap or WeatherAPI if configured in .env, with automatic live Open-Meteo fallback.
    """
    return await fetch_live_weather(latitude=lat, longitude=lon, district_name=district)

