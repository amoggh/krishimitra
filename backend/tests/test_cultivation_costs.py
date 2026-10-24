"""
Tests for the DES cultivation cost table and its use in the pipeline.
"""

import pandas as pd
import pytest

from crop_optimization.data_loader import load_cultivation_costs
from crop_optimization.data_pipeline.cultivation_costs import parse_sheet


def _fake_des_sheet(states: dict[str, tuple[float, float, float]]) -> pd.DataFrame:
    """Minimal sheet in the DES layout: header row with 'States', A2 / A2+FL / C2 rows."""
    names = list(states)
    rows = [
        ["Sl no", "Items                          States", None, *names],
        ["1.2", "Cost of Cultivation (Rs./Hectare)", "A2", *[states[n][0] for n in names]],
        ["1.3", None, "A2+FL", *[states[n][1] for n in names]],
        ["1.7", None, "C2", *[states[n][2] for n in names]],
        ["8.1", "Number of Holdings in Sample", None, *[10] * len(names)],
        ["9", "Derived Yield (Qtl./Hectare)", None, *[20.0] * len(names)],
    ]
    return pd.DataFrame([["title"] + [None] * (len(names) + 2)] * 2 + rows)


def test_parse_sheet_prefers_karnataka():
    sheet = _fake_des_sheet({"Gujarat": (10000, 12000, 15000), "Karnataka": (20000, 25000, 30000)})
    rec = parse_sheet(sheet, "Maize")
    assert rec["crop"] == "Maize"
    assert rec["cost_basis"] == "karnataka"
    assert rec["a2_inr_per_ha"] == 20000
    assert rec["a2fl_inr_per_ha"] == 25000


def test_parse_sheet_uses_median_without_karnataka():
    sheet = _fake_des_sheet({"A": (10000, 11000, 12000), "B": (20000, 21000, 22000), "C": (30000, 31000, 32000)})
    rec = parse_sheet(sheet, "Bajra")
    assert rec["cost_basis"] == "median_of_surveyed_states"
    assert rec["a2_inr_per_ha"] == 20000
    assert rec["states_in_basis"] == 3


def test_parse_sheet_maps_des_names():
    sheet = _fake_des_sheet({"Karnataka": (20000, 25000, 30000)})
    assert parse_sheet(sheet, "Moong")["crop"] == "Greengram / Moong"


def test_cost_table_loads_with_sane_values():
    costs = load_cultivation_costs()
    if costs is None:
        pytest.skip("cultivation_costs_2021_22.csv not built")
    assert "Maize" in costs.index
    row = costs.loc["Maize"]
    assert row["a2_inr_per_ha"] <= row["a2fl_inr_per_ha"] <= row["c2_inr_per_ha"]
    assert 10_000 < row["a2_inr_per_ha"] < 200_000


def test_pipeline_uses_real_costs_and_excludes_uncosted_crops():
    from crop_optimization.pipeline import _run_crop_optimization_internal
    from crop_optimization.schemas import FarmerInput

    if load_cultivation_costs() is None:
        pytest.skip("cultivation_costs_2021_22.csv not built")
    res = _run_crop_optimization_internal(FarmerInput(
        area_acres=5, district="Mysuru", investment_inr=150000, motor_hp=5,
        daily_electricity_hours=6, irrigation_type="drip", season="kharif",
    ))
    costs = load_cultivation_costs()
    for c in res.recommendations:
        assert c.crop in costs.index, f"{c.crop} has no verified cost but was allocated"
        assert c.expected_cost_inr and c.expected_cost_inr > 0
    excluded = [r for r in res.rejected_crops if "cost data" in r.reasons[0]]
    assert all(r.crop not in costs.index for r in excluded)
