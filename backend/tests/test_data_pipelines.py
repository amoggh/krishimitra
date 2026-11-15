"""
Tests for live mandi ingestion (live_mandi.py) and IMD rainfall (imd_rainfall.py).

All offline: the API is never called; .grd files are synthesised.
"""

import calendar
from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from crop_optimization.data_pipeline import imd_rainfall as imd
from crop_optimization.data_pipeline.live_mandi import (
    MandiStore,
    history_stats,
    normalize_record,
    price_alerts,
    price_volatility_index,
    volatility_report,
)

TODAY = date(2026, 10, 24)


def _api_record(day: date, price: float, market: str = "Mysuru") -> dict:
    return {
        "state": "Karnataka", "district": "Mysore", "market": market, "commodity": "Onion",
        "variety": "Local", "grade": "FAQ", "arrival_date": day.strftime("%d/%m/%Y"),
        "min_price": str(price * 0.9), "max_price": str(price * 1.1), "modal_price": str(price),
    }


@pytest.fixture
def store(tmp_path):
    return MandiStore(tmp_path / "mandi.sqlite")


def test_normalize_record_handles_api_and_csv_keys():
    api = normalize_record(_api_record(TODAY, 2000))
    csv = normalize_record({"State": "Karnataka", "District": "Mysore", "Market": "Mysuru",
                            "Commodity": "Onion", "Arrival_Date": "24/10/2026", "Modal_x0020_Price": 2000})
    assert api["arrival_date"] == csv["arrival_date"] == "2026-10-24"
    assert api["crop"] == csv["crop"] == "Onion"
    assert api["modal_price"] == csv["modal_price"] == 2000


def test_upsert_is_idempotent(store):
    recs = [_api_record(TODAY, 2000)]
    store.upsert(recs)
    store.upsert(recs)
    assert len(store.records("Onion")) == 1


def test_volatility_and_history(store):
    rng = np.random.default_rng(0)
    prices = 2000 * np.exp(np.cumsum(rng.normal(0, 0.05, 40)))
    store.upsert([_api_record(TODAY - timedelta(days=39 - i), p) for i, p in enumerate(prices)])
    rep = volatility_report(store, "Onion", today=TODAY)
    assert rep["price_days"] == 40
    assert 2.0 < rep["pvi_30d"] < 8.0      # ~5% daily noise
    stats = history_stats(store, "Onion", days=90, today=TODAY)
    assert stats["p10"] <= stats["median"] <= stats["p90"]
    assert stats["n_days"] == 40


def test_pvi_needs_enough_days():
    assert price_volatility_index(pd.Series([100.0, 101.0, 99.0]), 30) is None


def test_price_drop_and_90_day_high_alerts(store):
    days = [TODAY - timedelta(days=9 - i) for i in range(10)]
    store.upsert([_api_record(d, 1000 + 50 * i) for i, d in enumerate(days)])  # rising to 1450
    alerts = {a["type"] for a in price_alerts(store, "Onion", expected_price=2000, today=TODAY)}
    assert "price_drop" in alerts          # 1450 < 0.8 × 2000
    assert "high_90d" in alerts            # last price is the max


def test_imd_grid_reader_and_season_totals(tmp_path):
    for year in (2020, 2021):
        days = 366 if calendar.isleap(year) else 365
        grid = np.full((days, imd.N_LAT, imd.N_LON), 2.0, dtype="<f4")  # 2 mm every day everywhere
        grid[:, 0, 0] = imd.MISSING
        grid.tofile(tmp_path / f"{year}.grd")
    table = imd.build_rainfall_table(tmp_path)
    mysuru_kharif = table[(table.district == "Mysuru") & (table.season == "kharif")].iloc[0]
    assert mysuru_kharif["p25_mm"] == pytest.approx(2.0 * 122)   # Jun–Sep = 122 days
    rabi = table[(table.district == "Mysuru") & (table.season == "rabi")].iloc[0]
    assert rabi["n_years"] == 1                                   # Oct–Jan needs the next year


def test_water_budget_uses_imd_rainfall():
    from crop_optimization.data_loader import load_imd_rainfall
    from crop_optimization.schemas import FarmerInput
    from crop_optimization.water.water_budget import calculate_water_budget

    table = load_imd_rainfall()
    if table is None:
        pytest.skip("IMD rainfall table not built")
    wb = calculate_water_budget(FarmerInput(
        area_acres=5, district="Mysuru", investment_inr=150000, motor_hp=5,
        daily_electricity_hours=6, irrigation_type="drip", season="kharif"))
    row = table[(table.district == "Mysuru") & (table.season == "kharif")].iloc[0]
    # Plans are sized on the typical (median) year; the dry year (P25) is kept for the risk warning
    assert wb.effective_rainfall_mm == pytest.approx(round(row["median_mm"] * 0.70, 1))
    assert wb.effective_rainfall_dry_year_mm == pytest.approx(round(row["p25_mm"] * 0.70, 1))
    assert wb.rainfall_basis == "imd_median"


def test_dry_year_shortfall():
    from crop_optimization.pipeline import dry_year_shortfall
    from crop_optimization.schemas import CropAllocation

    allocs = [CropAllocation(crop="A", area_acres=5.0, area_hectares=2.02, percentage_of_total=100.0)]
    # need 400, dry rain 100 → irrigation 300 × 5 = 1500; pump 200 × 5 = 1000 → gap 500 of total need 2000
    assert dry_year_shortfall(allocs, {"A": 400}, 5.0, pumped_mm=200, dry_rain_mm=100) == pytest.approx(0.25)
    assert dry_year_shortfall(allocs, {"A": 400}, 5.0, pumped_mm=400, dry_rain_mm=100) == 0.0
    assert dry_year_shortfall(allocs, {"A": 400}, 5.0, pumped_mm=200, dry_rain_mm=None) is None


# ---------------------------------------------------------------------------
# CGWB groundwater stress
# ---------------------------------------------------------------------------


def test_groundwater_category_thresholds():
    from crop_optimization.data_pipeline.cgwb_groundwater import category_for

    assert category_for(55.3) == "safe"
    assert category_for(70.0) == "safe"
    assert category_for(81.7) == "semi_critical"
    assert category_for(96.5) == "critical"
    assert category_for(172.8) == "over_exploited"


def test_parse_annexure_rows_and_name_fixes():
    from crop_optimization.data_pipeline.cgwb_groundwater import parse_annexure_text

    text = (
        "header line\n"
        "19 Kolara 16.06 14.46 1.45 0.05 23.48 24.98 172.80 1.52 0.00\n"
        "4 Bengaluru (Rural) 7.30 6.64 0.91 0.29 9.03 10.23 154.00 0.98 0.00\n"
        "Total(TMC) 671.15 603.20 38.98 4.53 356.16 399.66 66.26 41.50 257.51\n"
    )
    t = parse_annexure_text(text).set_index("district")
    assert set(t.index) == {"Kolar", "Bengaluru Rural"}
    assert t.loc["Kolar", "stage_of_extraction_pct"] == 172.80
    assert t.loc["Kolar", "category"] == "over_exploited"


def test_water_budget_derates_pump_in_over_exploited_district():
    from crop_optimization.data_loader import load_groundwater_stress
    from crop_optimization.schemas import FarmerInput
    from crop_optimization.water.water_budget import calculate_water_budget

    gw = load_groundwater_stress()
    if gw is None:
        pytest.skip("Groundwater table not built")
    common = dict(area_acres=5, investment_inr=150000, motor_hp=5,
                  daily_electricity_hours=6, irrigation_type="drip", season="kharif")
    kolar = calculate_water_budget(FarmerInput(district="Kolar", **common))
    mysuru = calculate_water_budget(FarmerInput(district="Mysuru", **common))
    assert kolar.groundwater_category == "over_exploited"
    assert kolar.groundwater_pump_derate == pytest.approx(0.80)
    assert mysuru.groundwater_category == "safe"
    assert mysuru.groundwater_pump_derate == 1.0
    # Same pump and hours: the over-exploited district gets 80% of the pumped water
    assert kolar.seasonal_pumped_mm_mid == pytest.approx(mysuru.seasonal_pumped_mm_mid * 0.80, rel=0.01)
    assert any("over-exploited" in w for w in kolar.warnings)
