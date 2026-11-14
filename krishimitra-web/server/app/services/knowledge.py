"""Shared knowledge base: the same crop and district files the React app imports."""
from __future__ import annotations

import json
from functools import lru_cache

from app.config import settings


@lru_cache
def crops() -> list[dict]:
    return json.loads((settings.shared_dir / "crops.json").read_text(encoding="utf8"))


@lru_cache
def crop_by_id() -> dict[str, dict]:
    return {c["id"]: c for c in crops()}


@lru_cache
def districts() -> dict[str, dict]:
    return json.loads((settings.shared_dir / "districts.json").read_text(encoding="utf8"))


MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
START_MONTH = {"kharif": 6, "rabi": 10, "summer": 2}   # 1-based sowing month


def harvest_month(season: str, days: int) -> int:
    """0-based month index in which a crop sown in `season` is harvested."""
    return (START_MONTH[season] - 1 + min(12, -(-days // 30))) % 12
