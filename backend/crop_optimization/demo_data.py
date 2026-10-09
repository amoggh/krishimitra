"""
demo_data.py — Synthetic data for the KrushiMitra prototype demonstration.

=============================================================================
DEMO / SYNTHETIC DATA — FOR PROTOTYPE ONLY.
DO NOT USE FOR REAL FARMER RECOMMENDATIONS.
These values are illustrative and have NOT been sourced from government
databases, ICRISAT, AGMARKNET, IMD, or any other authoritative source.
=============================================================================

Everything in this file will later be replaced by:
  - Real crop requirements from ICAR / Karnataka Agriculture Dept
  - Real yield data from ICRISAT / desagri.gov.in
  - Real mandi prices from AGMARKNET
  - Real cultivation costs from Karnataka Agriculture Dept
  - Real weather data from IMD

The optimizer (NSGA-II) and Monte Carlo simulation themselves are real —
only the INPUT DATA to those algorithms is synthetic for now.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Demo farmer input
# ---------------------------------------------------------------------------
# This profile is used when running: python main.py --demo
# It is clearly labelled as DEMO INPUT.

DEMO_FARMER = {
    "area_acres": 5.0,
    "district": "Mysuru",
    "investment_inr": 150_000,
    "motor_hp": 5.0,
    "daily_electricity_hours": 6.0,
    "irrigation_type": "drip",
    "borewell_depth_ft": 300.0,
    "season": "kharif",
    "soil": {
        "ph": 6.8,
        "nitrogen": 120.0,
        "phosphorus": 40.0,
        "potassium": 180.0,
        "texture": "loamy",
    },
}

# ---------------------------------------------------------------------------
# Demo seasonal rainfall (used when weather.csv is absent)
# ---------------------------------------------------------------------------
# DEMO VALUE: 650 mm is a rough mid-range for Mysuru kharif.
# Replace with real IMD data when available.

DEMO_SEASONAL_RAINFALL_MM = 650.0

# ---------------------------------------------------------------------------
# Demo crop dataset
# ---------------------------------------------------------------------------
# Each entry represents one crop for the kharif season in Mysuru region.
#
# Fields:
#   crop                  — internal name (lowercase)
#   display_name          — for reports
#   season                — must match DEMO_FARMER["season"]
#   water_requirement_mm  — seasonal crop water requirement (SYNTHETIC)
#   min_ph / max_ph       — acceptable soil pH range (SYNTHETIC)
#   soil_types            — comma-separated compatible soil types
#
#   expected_yield_t_ha   — expected yield in tonnes/hectare (SYNTHETIC)
#   lower_yield_t_ha      — P10 yield (SYNTHETIC)
#   upper_yield_t_ha      — P90 yield (SYNTHETIC)
#
#   expected_price_inr_q  — expected harvest price ₹/quintal (SYNTHETIC)
#   lower_price_inr_q     — P10 price (SYNTHETIC)
#   upper_price_inr_q     — P90 price (SYNTHETIC)
#
#   cost_per_acre_inr     — cultivation cost per acre (SYNTHETIC)
#
# DEMO / SYNTHETIC DATA — NOT FROM ANY GOVERNMENT OR RESEARCH SOURCE.

DEMO_CROPS: list[dict] = [
    {
        "crop": "maize",
        "display_name": "Maize",
        "season": "kharif",
        "water_requirement_mm": 450,
        "min_ph": 5.8,
        "max_ph": 7.5,
        "soil_types": "loamy,red,sandy loam",
        "expected_yield_t_ha": 3.5,
        "lower_yield_t_ha": 2.5,
        "upper_yield_t_ha": 4.8,
        "expected_price_inr_q": 1900,
        "lower_price_inr_q": 1500,
        "upper_price_inr_q": 2400,
        "cost_per_acre_inr": 18_000,
    },
    {
        "crop": "ragi",
        "display_name": "Ragi (Finger Millet)",
        "season": "kharif",
        "water_requirement_mm": 380,
        "min_ph": 5.5,
        "max_ph": 7.0,
        "soil_types": "loamy,red,laterite",
        "expected_yield_t_ha": 2.2,
        "lower_yield_t_ha": 1.5,
        "upper_yield_t_ha": 3.0,
        "expected_price_inr_q": 3500,
        "lower_price_inr_q": 2800,
        "upper_price_inr_q": 4200,
        "cost_per_acre_inr": 14_000,
    },
    {
        "crop": "groundnut",
        "display_name": "Groundnut",
        "season": "kharif",
        "water_requirement_mm": 500,
        "min_ph": 6.0,
        "max_ph": 7.5,
        "soil_types": "sandy loam,loamy,red",
        "expected_yield_t_ha": 1.8,
        "lower_yield_t_ha": 1.2,
        "upper_yield_t_ha": 2.5,
        "expected_price_inr_q": 5500,
        "lower_price_inr_q": 4500,
        "upper_price_inr_q": 6800,
        "cost_per_acre_inr": 22_000,
    },
    {
        "crop": "cotton",
        "display_name": "Cotton",
        "season": "kharif",
        "water_requirement_mm": 700,
        "min_ph": 6.0,
        "max_ph": 8.0,
        "soil_types": "black,loamy,clay",
        "expected_yield_t_ha": 1.5,
        "lower_yield_t_ha": 0.9,
        "upper_yield_t_ha": 2.1,
        "expected_price_inr_q": 6200,
        "lower_price_inr_q": 5000,
        "upper_price_inr_q": 7500,
        "cost_per_acre_inr": 28_000,
    },
    {
        "crop": "soybean",
        "display_name": "Soybean",
        "season": "kharif",
        "water_requirement_mm": 480,
        "min_ph": 6.0,
        "max_ph": 7.5,
        "soil_types": "loamy,black,clay loam",
        "expected_yield_t_ha": 2.0,
        "lower_yield_t_ha": 1.4,
        "upper_yield_t_ha": 2.8,
        "expected_price_inr_q": 4200,
        "lower_price_inr_q": 3500,
        "upper_price_inr_q": 5200,
        "cost_per_acre_inr": 20_000,
    },
    {
        "crop": "onion",
        "display_name": "Onion",
        "season": "kharif",
        "water_requirement_mm": 420,
        "min_ph": 6.0,
        "max_ph": 7.0,
        "soil_types": "loamy,sandy loam",
        "expected_yield_t_ha": 20.0,
        "lower_yield_t_ha": 14.0,
        "upper_yield_t_ha": 26.0,
        "expected_price_inr_q": 1200,
        "lower_price_inr_q": 600,
        "upper_price_inr_q": 2800,
        "cost_per_acre_inr": 35_000,
    },
    {
        "crop": "rice",
        "display_name": "Rice (Paddy)",
        "season": "kharif",
        "water_requirement_mm": 1200,   # water-intensive — will be rejected
        "min_ph": 5.5,
        "max_ph": 7.0,
        "soil_types": "clay,loamy,black",
        "expected_yield_t_ha": 3.8,
        "lower_yield_t_ha": 2.8,
        "upper_yield_t_ha": 5.0,
        "expected_price_inr_q": 2100,
        "lower_price_inr_q": 1800,
        "upper_price_inr_q": 2500,
        "cost_per_acre_inr": 25_000,
    },
]
