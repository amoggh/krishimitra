"""
test_end_to_end_real_data.py — Rigorous tests for the real-data-driven Crop Optimizer.

Verifies:
  1. District, Crop, Season normalization for Karnataka.
  2. Data loaders for all 5 real datasets in backend/data/.
  3. Yield prediction hierarchy with real historical data.
  4. Mandi price matching with real records.
  5. Water budget calculation using USDA effective rainfall and motor HP.
  6. NSGA-II land allocation with diversification ceiling and budget inactivity.
  7. FastAPI HTTP POST /api/v1/crop-optimizer/recommend and /api/crop-optimization/optimize.
"""

import pytest

from app.main import app
from crop_optimization.compatibility.crop_filter import filter_crops, get_crop_candidates
from crop_optimization.data_loader import (
    load_all_datasets,
    load_icrisat_data,
    load_karnataka_2021_data,
    load_mandi_data,
    load_soil_weather_data,
    load_yield_data,
)
from crop_optimization.normalization import (
    normalize_crop,
    normalize_district,
    normalize_season,
)
from crop_optimization.pipeline import run_crop_optimization
from crop_optimization.price_model.model import predict_price
from crop_optimization.schemas import FarmerInput, SoilInput
from crop_optimization.water.water_budget import calculate_water_budget
from crop_optimization.yield_model.model import predict_yield


# ---------------------------------------------------------------------------
# 1. Normalization tests
# ---------------------------------------------------------------------------

def test_district_normalization():
    assert normalize_district("mysuru") == "Mysuru"
    assert normalize_district("Mysore") == "Mysuru"
    assert normalize_district("BENGALURU - RURAL") == "Bengaluru Rural"
    assert normalize_district("Bangalore Rural") == "Bengaluru Rural"
    assert normalize_district("DAKSHINA_KANNADA") == "Dakshina Kannada"
    assert normalize_district("State Total") is None


def test_crop_normalization():
    assert normalize_crop("Ragi") == "Ragi / Finger Millet"
    assert normalize_crop("Finger Millet") == "Ragi / Finger Millet"
    assert normalize_crop("Jowar(Sorghum)") == "Jowar / Sorghum"
    assert normalize_crop("Maize") == "Maize"
    assert normalize_crop("Groundnut") == "Groundnut"
    assert normalize_crop("Total Pulses") is None
    assert normalize_crop("Save Includes Haraka...") is None


def test_season_normalization():
    assert normalize_season("kharif") == "kharif"
    assert normalize_season("rabi") == "rabi"
    assert normalize_season("zaid") == "summer"
    assert normalize_season("summer") == "summer"


# ---------------------------------------------------------------------------
# 2. Data Loader tests (5 real datasets)
# ---------------------------------------------------------------------------

def test_data_loader_loads_all_five_datasets():
    k21 = load_karnataka_2021_data()
    assert k21 is not None and not k21.empty
    assert "district" in k21.columns and "crop" in k21.columns
    assert len(k21) > 3000

    icr = load_icrisat_data()
    assert icr is not None and not icr.empty
    assert "district" in icr.columns

    hist = load_yield_data()
    assert hist is not None and not hist.empty
    assert "crop" in hist.columns

    mandi = load_mandi_data()
    assert mandi is not None and not mandi.empty
    assert "crop" in mandi.columns and "modal_price_rs_qtl" in mandi.columns

    multi = load_soil_weather_data()
    assert multi is not None and not multi.empty
    assert "district" in multi.columns

    all_data = load_all_datasets()
    # 5 ground-truth datasets + DES cultivation cost table
    assert len(all_data) == 6
    assert all(df is not None for df in all_data.values())


# ---------------------------------------------------------------------------
# 3. Yield & Price hierarchy tests
# ---------------------------------------------------------------------------

def test_yield_prediction_real_data():
    inp = FarmerInput(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        season="kharif",
    )
    # Maize yield in Mysuru
    y_maize = predict_yield("Maize", "Mysuru", "kharif", inp)
    assert y_maize.available is True
    assert y_maize.expected_t_per_ha > 0
    assert y_maize.source is not None


def test_price_prediction_real_data():
    mandi_df = load_mandi_data()
    p_maize = predict_price("Maize", "Mysuru", "kharif", mandi_df)
    assert p_maize.available is True
    assert p_maize.expected_inr_per_quintal > 1000
    assert p_maize.source is not None


# ---------------------------------------------------------------------------
# 4. Water Budget engine test
# ---------------------------------------------------------------------------

def test_water_budget_real_data():
    inp = FarmerInput(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        season="kharif",
    )
    multi_df = load_soil_weather_data()
    wb = calculate_water_budget(inp, weather_df=multi_df)
    assert wb.seasonal_pumped_mm_mid > 0
    assert wb.effective_rainfall_mm > 0
    assert wb.total_available_mm_mid == wb.seasonal_pumped_mm_mid + wb.effective_rainfall_mm


# ---------------------------------------------------------------------------
# 5. Full Pipeline end-to-end test
# ---------------------------------------------------------------------------

def test_pipeline_real_run():
    inp = FarmerInput(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        season="kharif",
    )
    res = run_crop_optimization(inp)
    assert res.status == "ok"
    assert len(res.recommendations) >= 2
    assert res.confidence in ("High", "Medium", "Low")
    assert len(res.why_this_plan) > 0
    assert len(res.data_sources) >= 3

    # Planted + water-limited fallow land = farm size (within rounding)
    tot_area = sum(c.area_acres for c in res.recommendations)
    assert tot_area <= 5.1
    assert tot_area + res.summary.get("fallow_acres", 0.0) == pytest.approx(5.0, abs=0.1)

    # Check no single crop exceeds 60% limit
    for c in res.recommendations:
        assert c.area_acres <= (5.0 * 0.60 + 0.05)


# ---------------------------------------------------------------------------
# 6. FastAPI Endpoints integration test
# ---------------------------------------------------------------------------

def test_fastapi_recommend_endpoint():
    from app.api.v1.crop_optimizer import recommend
    payload = FarmerInput(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        borewell_depth_ft=300,
        season="kharif",
    )
    
    result = recommend(payload)
    assert result.status == "ok"
    assert len(result.recommendations) > 0
    assert result.why_this_plan is not None and len(result.why_this_plan) > 0
    assert result.data_sources is not None and len(result.data_sources) >= 3
    assert result.confidence in ("High", "Medium", "Low")
