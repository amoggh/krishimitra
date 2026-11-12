from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

class WeatherData(BaseModel):
    location: str
    latitude: float
    longitude: float
    temp_c: float
    condition: str
    rain_chance_pct: int
    humidity_pct: int
    precipitation_mm: float
    pressure_hpa: int
    wind_speed_kmh: float
    sunrise: str
    sunset: str
    source: str
    updated_at: str

# Simple in-memory cache with 15-minute TTL
_WEATHER_CACHE: dict[str, tuple[WeatherData, float]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes

def _get_openweather_key() -> str:
    key = os.getenv("OPENWEATHER_API_KEY", "") or getattr(settings, "openweather_api_key", "")
    return (key or "").strip().strip('"').strip("'")

def _get_weatherapi_key() -> str:
    key = os.getenv("WEATHERAPI_KEY", "") or getattr(settings, "weatherapi_key", "")
    return (key or "").strip().strip('"').strip("'")

def _wmo_code_to_condition(code: int) -> str:
    """Map Open-Meteo WMO weather codes to human-readable agricultural conditions."""
    if code == 0:
        return "Clear sky"
    elif code in (1, 2, 3):
        return "Partly cloudy"
    elif code in (45, 48):
        return "Foggy"
    elif code in (51, 53, 55):
        return "Drizzle"
    elif code in (61, 63, 65):
        return "Rain"
    elif code in (80, 81, 82):
        return "Rain showers"
    elif code in (95, 96, 99):
        return "Thunderstorm"
    return "Cloudy"

async def fetch_live_weather(
    latitude: float,
    longitude: float,
    district_name: str = "Mandya",
) -> WeatherData:
    cache_key = f"{round(latitude, 3)}_{round(longitude, 3)}"
    now_ts = datetime.now(timezone.utc).timestamp()

    # Check cache
    if cache_key in _WEATHER_CACHE:
        cached_data, cached_at = _WEATHER_CACHE[cache_key]
        if now_ts - cached_at < CACHE_TTL_SECONDS:
            return cached_data

    owm_key = _get_openweather_key()
    wapi_key = _get_weatherapi_key()

    # 1. Try OpenWeatherMap if key is provided
    if owm_key and owm_key != "YOUR_OPENWEATHER_API_KEY":
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "lat": latitude,
                    "lon": longitude,
                    "units": "metric",
                    "appid": owm_key,
                }
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    d = resp.json()
                    main = d.get("main", {})
                    wind = d.get("wind", {})
                    weather_desc = d.get("weather", [{}])[0].get("description", "Clear").title()
                    sys = d.get("sys", {})

                    # Convert sunrise & sunset to local farm time using OpenWeather timezone offset (IST = +19800s)
                    tz_offset = d.get("timezone", 19800)
                    local_tz = timezone(timedelta(seconds=tz_offset))

                    sunrise_ts = sys.get("sunrise")
                    sunset_ts = sys.get("sunset")
                    sunrise_str = (
                        datetime.fromtimestamp(sunrise_ts, local_tz).strftime("%I:%M %p").lower()
                        if sunrise_ts
                        else "06:15 am"
                    )
                    sunset_str = (
                        datetime.fromtimestamp(sunset_ts, local_tz).strftime("%I:%M %p").lower()
                        if sunset_ts
                        else "06:00 pm"
                    )

                    rain_mm = d.get("rain", {}).get("1h", 0.0)
                    clouds = d.get("clouds", {}).get("all", 0)

                    result = WeatherData(
                        location=d.get("name") or district_name,
                        latitude=latitude,
                        longitude=longitude,
                        temp_c=round(float(main.get("temp", 28.0)), 1),
                        condition=weather_desc,
                        rain_chance_pct=int(clouds if rain_mm == 0 else min(90, clouds + 20)),
                        humidity_pct=int(main.get("humidity", 60)),
                        precipitation_mm=round(float(rain_mm), 1),
                        pressure_hpa=int(main.get("pressure", 1012)),
                        wind_speed_kmh=round(float(wind.get("speed", 3.0)) * 3.6, 1),
                        sunrise=sunrise_str,
                        sunset=sunset_str,
                        source="OpenWeatherMap (Real-time)",
                        updated_at="Just now",
                    )
                    _WEATHER_CACHE[cache_key] = (result, now_ts)
                    return result
        except Exception as exc:
            logger.warning(f"OpenWeatherMap request failed: {exc}. Trying fallback...")

    # 2. Try WeatherAPI.com if key is provided
    if wapi_key and wapi_key != "YOUR_WEATHERAPI_KEY":
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                url = "https://api.weatherapi.com/v1/forecast.json"
                params = {
                    "key": wapi_key,
                    "q": f"{latitude},{longitude}",
                    "days": 1,
                    "aqi": "no",
                }
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    d = resp.json()
                    curr = d.get("current", {})
                    forecast_day = (
                        d.get("forecast", {}).get("forecastday", [{}])[0]
                    )
                    day_info = forecast_day.get("day", {})
                    astro = forecast_day.get("astro", {})

                    result = WeatherData(
                        location=d.get("location", {}).get("name") or district_name,
                        latitude=latitude,
                        longitude=longitude,
                        temp_c=round(float(curr.get("temp_c", 28.0)), 1),
                        condition=curr.get("condition", {}).get("text", "Partly cloudy"),
                        rain_chance_pct=int(day_info.get("daily_chance_of_rain", 15)),
                        humidity_pct=int(curr.get("humidity", 58)),
                        precipitation_mm=round(float(curr.get("precip_mm", 0.0)), 1),
                        pressure_hpa=int(curr.get("pressure_mb", 1012)),
                        wind_speed_kmh=round(float(curr.get("wind_kph", 12.0)), 1),
                        sunrise=astro.get("sunrise", "05:45 AM").lower(),
                        sunset=astro.get("sunset", "06:15 PM").lower(),
                        source="WeatherAPI (Real-time)",
                        updated_at="Just now",
                    )
                    _WEATHER_CACHE[cache_key] = (result, now_ts)
                    return result
        except Exception as exc:
            logger.warning(f"WeatherAPI request failed: {exc}. Trying Open-Meteo...")

    # 3. Default Live Satellite/Meteo Provider (Open-Meteo: Real live data, no key required)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,weather_code",
                "daily": "sunrise,sunset,precipitation_probability_max",
                "timezone": "auto",
            }
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                d = resp.json()
                curr = d.get("current", {})
                daily = d.get("daily", {})

                weather_code = int(curr.get("weather_code", 0))
                cond_text = _wmo_code_to_condition(weather_code)

                # Format sunrise/sunset to 12-hour AM/PM format
                sunrise_raw = (daily.get("sunrise") or [""])[0]
                sunset_raw = (daily.get("sunset") or [""])[0]
                try:
                    s_rise = datetime.fromisoformat(sunrise_raw)
                    sunrise_str = s_rise.strftime("%I:%M %p").lower()
                except Exception:
                    sunrise_str = "06:15 am"

                try:
                    s_set = datetime.fromisoformat(sunset_raw)
                    sunset_str = s_set.strftime("%I:%M %p").lower()
                except Exception:
                    sunset_str = "06:00 pm"

                precip_prob = (daily.get("precipitation_probability_max") or [15])[0]

                result = WeatherData(
                    location=district_name,
                    latitude=latitude,
                    longitude=longitude,
                    temp_c=round(float(curr.get("temperature_2m", 29.0)), 1),
                    condition=cond_text,
                    rain_chance_pct=int(precip_prob or 15),
                    humidity_pct=int(curr.get("relative_humidity_2m", 60)),
                    precipitation_mm=round(float(curr.get("precipitation", 0.0)), 1),
                    pressure_hpa=int(curr.get("surface_pressure", 1012)),
                    wind_speed_kmh=round(float(curr.get("wind_speed_10m", 12.0)), 1),
                    sunrise=sunrise_str,
                    sunset=sunset_str,
                    source="Open-Meteo Live API",
                    updated_at="Live (Satellite)",
                )
                _WEATHER_CACHE[cache_key] = (result, now_ts)
                return result
    except Exception as exc:
        logger.warning(f"Open-Meteo request failed: {exc}. Using agro-climatic base.")

    # 4. Fallback baseline
    return WeatherData(
        location=district_name,
        latitude=latitude,
        longitude=longitude,
        temp_c=31.5,
        condition="Partly cloudy",
        rain_chance_pct=20,
        humidity_pct=65,
        precipitation_mm=0.0,
        pressure_hpa=1012,
        wind_speed_kmh=12.0,
        sunrise="05:45 am",
        sunset="06:15 pm",
        source="Karnataka Agro-Climate Baseline",
        updated_at="Index Baseline",
    )

