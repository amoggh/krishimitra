"""
utils.py — Reusable utility functions for the Crop Optimization module.

Keep this file small. Only put things here that are used across
more than one sub-module.
"""

from __future__ import annotations

import logging
import math
from typing import Optional

from crop_optimization.config import (
    ACRES_PER_HECTARE,
    KG_PER_TONNE,
    KG_PER_QUINTAL,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Unit conversions
# ---------------------------------------------------------------------------


def acres_to_hectares(acres: float) -> float:
    """Convert acres to hectares."""
    return acres / ACRES_PER_HECTARE


def hectares_to_acres(hectares: float) -> float:
    """Convert hectares to acres."""
    return hectares * ACRES_PER_HECTARE


def kg_to_tonnes(kg: float) -> float:
    """Convert kilograms to tonnes."""
    return kg / KG_PER_TONNE


def tonnes_to_kg(tonnes: float) -> float:
    """Convert tonnes to kilograms."""
    return tonnes * KG_PER_TONNE


def kg_to_quintals(kg: float) -> float:
    """Convert kilograms to quintals (1 quintal = 100 kg)."""
    return kg / KG_PER_QUINTAL


def quintals_to_kg(quintals: float) -> float:
    """Convert quintals to kilograms."""
    return quintals * KG_PER_QUINTAL


def inr_per_kg_to_inr_per_quintal(price_per_kg: float) -> float:
    """Convert ₹/kg to ₹/quintal."""
    return price_per_kg * KG_PER_QUINTAL


def inr_per_quintal_to_inr_per_kg(price_per_quintal: float) -> float:
    """Convert ₹/quintal to ₹/kg."""
    return price_per_quintal / KG_PER_QUINTAL


def tonnes_per_ha_to_quintals_per_acre(t_per_ha: float) -> float:
    """
    Convert yield from tonnes/hectare to quintals/acre.
    Useful for displaying farmer-facing numbers.
    """
    kg_per_ha = t_per_ha * KG_PER_TONNE
    quintals_per_ha = kg_per_ha / KG_PER_QUINTAL
    return quintals_per_ha / ACRES_PER_HECTARE


# ---------------------------------------------------------------------------
# Safe numeric conversion
# ---------------------------------------------------------------------------


def safe_float(value, default: Optional[float] = None) -> Optional[float]:
    """
    Safely convert a value to float.
    Returns `default` if conversion fails or value is NaN/Inf.
    """
    if value is None:
        return default
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def safe_int(value, default: Optional[int] = None) -> Optional[int]:
    """Safely convert a value to int. Returns `default` on failure."""
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger.

    Usage:
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)


def configure_logging(level: int = logging.INFO) -> None:
    """
    Configure basic logging for the module.
    Call once at application startup (main.py does this).
    """
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


# ---------------------------------------------------------------------------
# Data validation helpers
# ---------------------------------------------------------------------------


def check_positive(value: float, name: str) -> None:
    """Raise ValueError if value is not strictly positive."""
    if value <= 0:
        raise ValueError(f"{name} must be positive. Got {value}.")


def check_fraction(value: float, name: str) -> None:
    """Raise ValueError if value is not in [0, 1]."""
    if not (0.0 <= value <= 1.0):
        raise ValueError(f"{name} must be between 0 and 1. Got {value}.")


def normalise_string(value: str) -> str:
    """Strip whitespace and convert to lowercase."""
    return value.strip().lower()
