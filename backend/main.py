"""
main.py — KrushiMitra backend entry point.

Usage:
    # Run the demo (prototype presentation):
    python main.py --demo

    # Start the FastAPI server:
    uvicorn app.main:app --reload

The --demo flag runs the complete optimization pipeline using synthetic
demo data and prints a clean terminal report. No internet, no CSV files,
and no trained ML models are required.

The FastAPI server (app/main.py) is the production API and is unaffected
by this file.
"""

from __future__ import annotations

import argparse
import logging
import sys

# Configure simple logging so pipeline messages are readable
logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")


# ---------------------------------------------------------------------------
# Demo report printer
# ---------------------------------------------------------------------------

def _fmt_inr(value: float | None) -> str:
    """Format an INR value with ₹ and comma separation."""
    if value is None:
        return "N/A"
    if abs(value) >= 100_000:
        return f"₹{value / 100_000:.2f} L"
    return f"₹{value:,.0f}"


def _fmt_pct(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value:.1%}"


def run_demo() -> None:
    """
    Execute the full demo pipeline and print a structured report.

    ================================================================
    WARNING: This demonstration uses SYNTHETIC / DEMO data.
    It is NOT suitable for real farming decisions.
    ================================================================
    """
    from crop_optimization.demo_data import DEMO_FARMER
    from crop_optimization.pipeline import optimize_crops
    from crop_optimization.schemas import FarmerInput, SoilInput

    # ------------------------------------------------------------------
    # Build demo farmer input
    # ------------------------------------------------------------------
    soil_raw = DEMO_FARMER["soil"]
    farmer = FarmerInput(
        area_acres=DEMO_FARMER["area_acres"],
        district=DEMO_FARMER["district"],
        investment_inr=DEMO_FARMER["investment_inr"],
        motor_hp=DEMO_FARMER["motor_hp"],
        daily_electricity_hours=DEMO_FARMER["daily_electricity_hours"],
        irrigation_type=DEMO_FARMER["irrigation_type"],
        borewell_depth_ft=DEMO_FARMER["borewell_depth_ft"],
        season=DEMO_FARMER["season"],
        soil=SoilInput(
            ph=soil_raw["ph"],
            nitrogen=soil_raw["nitrogen"],
            phosphorus=soil_raw["phosphorus"],
            potassium=soil_raw["potassium"],
            texture=soil_raw["texture"],
        ),
    )

    # ------------------------------------------------------------------
    # Run pipeline
    # ------------------------------------------------------------------
    result = optimize_crops(farmer, demo_mode=True)

    # ------------------------------------------------------------------
    # Print report
    # ------------------------------------------------------------------
    W = "=" * 60

    print(f"\n{W}")
    print(" KRUSHIMITRA CROP OPTIMIZER")
    print(" DEMO MODE — PROTOTYPE PRESENTATION")
    print(W)
    print()
    print("  ⚠ WARNING: This demonstration uses SYNTHETIC data.")
    print("  ⚠ It is NOT suitable for real farmer recommendations.")
    print("  ⚠ No government datasets, trained ML models, or live")
    print("  ⚠ mandi prices were used in producing this output.")
    print()

    # ---- Farmer Input ----
    print(f"{'─' * 60}")
    print(" DEMO FARMER INPUT")
    print(f"{'─' * 60}")
    print(f"  Land         : {farmer.area_acres} acres")
    print(f"  District     : {farmer.district}, Karnataka")
    print(f"  Budget       : {_fmt_inr(farmer.investment_inr)}")
    print(f"  Motor        : {farmer.motor_hp} HP")
    print(f"  Electricity  : {farmer.daily_electricity_hours} hours/day")
    print(f"  Irrigation   : {farmer.irrigation_type.capitalize()}")
    print(f"  Borewell     : {farmer.borewell_depth_ft} ft")
    print(f"  Season       : {farmer.season.capitalize()}")
    if farmer.soil:
        print(f"  Soil pH      : {farmer.soil.ph}")
        print(f"  NPK          : N={farmer.soil.nitrogen}  P={farmer.soil.phosphorus}  K={farmer.soil.potassium}")
        print(f"  Texture      : {farmer.soil.texture}")

    # ---- Water Budget ----
    wb = result.water_budget
    print()
    print(f"{'─' * 60}")
    print(" WATER BUDGET  [DEMO — engineering approximation]")
    print(f"{'─' * 60}")
    print(f"  Daily pump output  : {wb.estimated_daily_litres_mid:,.0f} L/day "
          f"({wb.estimated_daily_litres_low:,.0f}–{wb.estimated_daily_litres_high:,.0f})")
    print(f"  Seasonal pumped    : {wb.seasonal_pumped_mm_mid:.1f} mm "
          f"({wb.seasonal_pumped_mm_low:.1f}–{wb.seasonal_pumped_mm_high:.1f})")
    print(f"  Effective rainfall : {wb.effective_rainfall_mm:.1f} mm  [DEMO VALUE]")
    print(f"  Total available    : {wb.total_available_mm_mid:.1f} mm  [DEMO ESTIMATE]")
    for w in wb.warnings:
        print(f"  ⚠ {w}")

    # ---- Crop Compatibility ----
    print()
    print(f"{'─' * 60}")
    print(" CROP COMPATIBILITY FILTER")
    print(f"{'─' * 60}")

    compatible   = [r for r in result.recommendations]
    all_compat   = {r.crop for r in compatible}
    rejected_map = {r.crop: r.reasons for r in result.rejected_crops}

    # Print accepted
    for cr in result.recommendations:
        print(f"  ✅  {cr.crop.capitalize():<14}  ({cr.area_acres:.2f} ac allocated)")
    for crop_name, reasons in rejected_map.items():
        short = reasons[0][:70] + "…" if len(reasons[0]) > 70 else reasons[0]
        print(f"  ❌  {crop_name.capitalize():<14}  {short}")

    # ---- Yield & Price (demo) ----
    print()
    print(f"{'─' * 60}")
    print(" DEMO YIELD & PRICE ESTIMATES  [SYNTHETIC — NOT FROM MODEL]")
    print(f"{'─' * 60}")
    print(f"  {'Crop':<14}  {'Yield (t/ha)':<22}  {'Price (₹/q)'}")
    print(f"  {'─'*14}  {'─'*22}  {'─'*20}")
    for cr in result.recommendations:
        y = cr.yield_result
        p = cr.price_result
        y_str = (f"{y.lower_t_per_ha:.1f}–{y.upper_t_per_ha:.1f}"
                 if y and y.available else "N/A")
        p_str = (f"{p.lower_inr_per_quintal:,.0f}–{p.upper_inr_per_quintal:,.0f}"
                 if p and p.available else "N/A")
        print(f"  {cr.crop.capitalize():<14}  {y_str:<22}  {p_str}")

    # ---- Cost & Profit ----
    print()
    print(f"{'─' * 60}")
    print(" ECONOMICS  [DEMO — SYNTHETIC COSTS & PRICES]")
    print(f"{'─' * 60}")
    total_revenue = 0.0
    total_cost    = 0.0
    total_profit  = 0.0
    for cr in result.recommendations:
        rev  = cr.expected_revenue_inr or 0.0
        cost = cr.expected_cost_inr    or 0.0
        net  = cr.expected_net_profit_inr or 0.0
        total_revenue += rev
        total_cost    += cost
        total_profit  += net
        print(f"  {cr.crop.capitalize():<14}  Revenue {_fmt_inr(rev):<14}  "
              f"Cost {_fmt_inr(cost):<14}  Net {_fmt_inr(net)}")
    print(f"  {'─'*14}  {'─'*14}  {'─'*14}")
    print(f"  {'TOTAL':<14}  Revenue {_fmt_inr(total_revenue):<14}  "
          f"Cost {_fmt_inr(total_cost):<14}  Net {_fmt_inr(total_profit)}")

    # ---- Risk ----
    print()
    print(f"{'─' * 60}")
    print(" MONTE CARLO RISK  [DEMO DISTRIBUTIONS — SYNTHETIC]")
    print(f"{'─' * 60}")
    print(f"  Simulations: 5,000 per crop  |  Seed: 42 (deterministic)")
    print()
    for cr in result.recommendations:
        r = cr.risk_result
        if r and r.available:
            print(f"  {cr.crop.capitalize()}")
            print(f"    Expected profit        : {_fmt_inr(r.expected_profit_inr)}")
            print(f"    P10 (downside)         : {_fmt_inr(r.profit_p10_inr)}")
            print(f"    P90 (upside)           : {_fmt_inr(r.profit_p90_inr)}")
            print(f"    Yield failure prob.    : {_fmt_pct(r.yield_failure_probability)}")
            print(f"    Price crash prob.      : {_fmt_pct(r.price_crash_probability)}")
            print(f"    Risk-adjusted profit   : {_fmt_inr(r.risk_adjusted_profit_inr)}")
        else:
            note = r.unavailable_reason if r else "Risk data not available."
            print(f"  {cr.crop.capitalize()}: {note}")

    # ---- NSGA-II Allocation ----
    print()
    print(f"{'─' * 60}")
    print(" NSGA-II OPTIMIZATION RESULT")
    print(f"{'─' * 60}")
    total_alloc = sum(cr.area_acres for cr in result.recommendations)
    total_water_used = sum(
        (cr.water_requirement_mm or 0) * cr.area_acres
        for cr in result.recommendations
    )
    water_remaining = wb.total_available_mm_mid - total_water_used / max(total_alloc, 1)

    print(f"  {'Crop':<14}  {'Acres':>6}  {'%':>5}  {'Water req.':>12}")
    print(f"  {'─'*14}  {'─'*6}  {'─'*5}  {'─'*12}")
    for cr in result.recommendations:
        wr = f"{cr.water_requirement_mm:.0f} mm" if cr.water_requirement_mm else "–"
        print(f"  {cr.crop.capitalize():<14}  {cr.area_acres:>6.2f}  "
              f"{cr.percentage_of_total:>4.1f}%  {wr:>12}")
    print(f"  {'─'*14}  {'─'*6}")
    print(f"  {'TOTAL':<14}  {total_alloc:>6.2f} / {farmer.area_acres:.2f} acres")
    print()
    print(f"  Budget used : {_fmt_inr(total_cost)} / {_fmt_inr(farmer.investment_inr)}")
    print(f"  Water avail : {wb.total_available_mm_mid:.1f} mm  [DEMO]")

    # ---- Why this allocation ----
    print()
    print(f"{'─' * 60}")
    print(" WHY THIS ALLOCATION?  [DEMO EXPLANATIONS]")
    print(f"{'─' * 60}")
    for cr in result.recommendations:
        print(f"  {cr.crop.capitalize()}")
        for reason in cr.reasons[:3]:
            print(f"    • {reason}")
        print()

    if result.rejected_crops:
        print("  Rejected crops:")
        for rej in result.rejected_crops:
            print(f"    ✗ {rej.crop.capitalize()}: {rej.reasons[0]}")

    # ---- Warnings ----
    if result.warnings:
        print()
        print(f"{'─' * 60}")
        print(" SYSTEM WARNINGS")
        print(f"{'─' * 60}")
        for w in result.warnings[:6]:
            print(f"  ⚠ {w}")

    print()
    print(f"{'─' * 60}")
    print(" DATA STATUS")
    print(f"{'─' * 60}")
    dq = result.data_quality
    print(f"  Soil data        : {'✅ Demo (synthetic)' if dq.soil_data_available else '❌ Missing'}")
    print(f"  Weather data     : {'✅ Demo (synthetic)' if dq.weather_data_available else '❌ Missing'}")
    print(f"  Mandi prices     : {'✅' if dq.mandi_data_available else '❌ Missing (not used in demo)'}")
    print(f"  Yield model      : {'✅ Demo predictions' if dq.yield_model_trained else '❌ Not trained'}")
    print(f"  Price model      : {'✅ Demo predictions' if dq.price_model_trained else '❌ Not trained'}")

    print()
    print(W)
    print(" END OF DEMO")
    print(W)
    print()
    print("  To replace demo data with real data:")
    print("  1. Place CSV files in crop_optimization/data/")
    print("  2. Run: python train_yield_model.py")
    print("  3. Run: python train_price_model.py")
    print("  4. Start API: uvicorn app.main:app --reload")
    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="python main.py",
        description="KrushiMitra Crop Optimizer",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run the prototype demo with synthetic data (no CSV files required).",
    )

    args = parser.parse_args()

    if args.demo:
        run_demo()
    else:
        parser.print_help()
        print()
        print("To run the demo:       python main.py --demo")
        print("To start the API:      uvicorn app.main:app --reload")
        sys.exit(0)


if __name__ == "__main__":
    main()
