"""
test_water_budget.py — Tests for the water budget module.

All tests work offline — no internet access, no live data required.
"""

import pytest

from crop_optimization.schemas import FarmerInput, SoilInput
from crop_optimization.water.water_budget import calculate_water_budget


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def make_input(**overrides) -> FarmerInput:
    """Create a valid FarmerInput with sensible defaults."""
    defaults = dict(
        area_acres=5.0,
        district="Mysuru",
        investment_inr=150_000,
        motor_hp=5.0,
        daily_electricity_hours=6.0,
        irrigation_type="drip",
        season="kharif",
    )
    defaults.update(overrides)
    return FarmerInput(**defaults)


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------


def test_invalid_motor_hp_raises():
    with pytest.raises(Exception):
        make_input(motor_hp=4.0)  # 4 is not in VALID_MOTOR_HP


def test_invalid_irrigation_type_raises():
    with pytest.raises(Exception):
        make_input(irrigation_type="underground")


def test_invalid_season_raises():
    with pytest.raises(Exception):
        make_input(season="monsoon")


def test_electricity_hours_out_of_range():
    with pytest.raises(Exception):
        make_input(daily_electricity_hours=25.0)


def test_negative_area_raises():
    with pytest.raises(Exception):
        make_input(area_acres=-1.0)


# ---------------------------------------------------------------------------
# Water budget calculations
# ---------------------------------------------------------------------------


def test_water_budget_returns_result():
    inp = make_input()
    result = calculate_water_budget(inp, weather_df=None)
    assert result is not None


def test_daily_litres_positive():
    inp = make_input(motor_hp=5.0, daily_electricity_hours=6.0)
    result = calculate_water_budget(inp, weather_df=None)
    assert result.estimated_daily_litres_mid > 0


def test_drip_efficiency_higher_than_flood():
    """Drip irrigation should produce more effective water than flood."""
    base = dict(
        area_acres=5.0, district="Mysuru", investment_inr=100_000,
        motor_hp=5.0, daily_electricity_hours=6.0, season="kharif"
    )
    drip = calculate_water_budget(FarmerInput(**base, irrigation_type="drip"), None)
    flood = calculate_water_budget(FarmerInput(**base, irrigation_type="flood"), None)
    assert drip.seasonal_pumped_mm_mid > flood.seasonal_pumped_mm_mid


def test_more_electricity_means_more_water():
    inp_6h = make_input(daily_electricity_hours=6.0)
    inp_3h = make_input(daily_electricity_hours=3.0)
    r6 = calculate_water_budget(inp_6h, None)
    r3 = calculate_water_budget(inp_3h, None)
    assert r6.seasonal_pumped_mm_mid > r3.seasonal_pumped_mm_mid


def test_higher_hp_means_more_water():
    inp_5hp = make_input(motor_hp=5.0)
    inp_2hp = make_input(motor_hp=2.0)
    r5 = calculate_water_budget(inp_5hp, None)
    r2 = calculate_water_budget(inp_2hp, None)
    assert r5.seasonal_pumped_mm_mid > r2.seasonal_pumped_mm_mid


def test_zero_electricity_means_zero_pumped():
    inp = make_input(daily_electricity_hours=0.0)
    result = calculate_water_budget(inp, None)
    assert result.seasonal_pumped_mm_mid == 0.0


def test_missing_weather_data_warning():
    """When weather_df is None, a warning about rainfall should appear."""
    inp = make_input()
    result = calculate_water_budget(inp, weather_df=None)
    assert any("weather" in w.lower() or "rainfall" in w.lower() for w in result.warnings)


def test_deep_borewell_reduces_flow():
    """A very deep borewell should produce less estimated flow than a shallow one."""
    inp_deep = make_input(borewell_depth_ft=400.0)
    inp_shallow = make_input(borewell_depth_ft=100.0)
    r_deep = calculate_water_budget(inp_deep, None)
    r_shallow = calculate_water_budget(inp_shallow, None)
    assert r_deep.seasonal_pumped_mm_mid < r_shallow.seasonal_pumped_mm_mid


def test_missing_borewell_depth_warning():
    """No borewell depth → warning about uncertainty."""
    inp = make_input(borewell_depth_ft=None)
    result = calculate_water_budget(inp, None)
    assert any("borewell" in w.lower() for w in result.warnings)


def test_low_electricity_warning():
    """Very low electricity hours should trigger a warning."""
    inp = make_input(daily_electricity_hours=2.0)
    result = calculate_water_budget(inp, None)
    assert any("electricity" in w.lower() or "hours" in w.lower() for w in result.warnings)


def test_low_range_always_less_than_high():
    inp = make_input()
    result = calculate_water_budget(inp, None)
    assert result.seasonal_pumped_mm_low <= result.seasonal_pumped_mm_mid
    assert result.seasonal_pumped_mm_mid <= result.seasonal_pumped_mm_high


def test_total_available_includes_pumped():
    inp = make_input()
    result = calculate_water_budget(inp, None)
    # With no weather data, effective_rainfall = 0, so total = pumped_mid
    assert result.total_available_mm_mid == result.seasonal_pumped_mm_mid


# ---------------------------------------------------------------------------
# Irrigation efficiency values
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("irr_type", ["flood", "furrow", "sprinkler", "drip"])
def test_all_irrigation_types_work(irr_type):
    inp = make_input(irrigation_type=irr_type)
    result = calculate_water_budget(inp, None)
    assert result.seasonal_pumped_mm_mid >= 0
