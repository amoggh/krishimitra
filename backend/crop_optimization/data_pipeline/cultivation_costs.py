"""
data_pipeline/cultivation_costs.py — Build the per-crop cultivation cost table.

Source: Directorate of Economics & Statistics (DES), Ministry of Agriculture & FW,
"Estimates of Cost of Cultivation / Production & Related Data", crop year 2021-22
(Comprehensive Scheme for Cost of Cultivation — the data CACP uses for MSP).
Download page: https://desagri.gov.in/document-report-category/cost-of-cultivation-production-estimates/
File:          CS-Consolidated-Crop-year-wise-2021-22-4.xlsx (one sheet per crop, one column per state)

Cost concepts (Rs/hectare):
  A2     — paid-out cash costs (seed, fertiliser, hired labour, machinery, irrigation, ...)
  A2+FL  — A2 plus imputed value of family labour
  C2     — A2+FL plus rent on owned land and interest on owned capital

The optimizer uses A2 for the budget constraint (cash the farmer must spend) and
A2+FL for profit (family labour has a real cost).

When Karnataka was not surveyed for a crop, the median across surveyed states is
used and flagged with cost_basis = "median_of_surveyed_states".

Usage (from backend/):
    python -m crop_optimization.data_pipeline.cultivation_costs path/to/CS-Consolidated-Crop-year-wise-2021-22-4.xlsx
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from crop_optimization.config import CULTIVATION_COSTS_CSV, DATA_DIR
from crop_optimization.normalization import normalize_crop

logger = logging.getLogger(__name__)

SOURCE_LABEL = "DES Cost of Cultivation/Production Estimates 2021-22"
SOURCE_YEAR = "2021-22"
TARGET_STATE = "karnataka"

# DES sheet names that normalize_crop does not map to our canonical names
SHEET_TO_CROP = {
    "Moong": "Greengram / Moong",
    "R&M": "Mustard",
}
# Sheets with a different layout or not usable as field-crop costs
SKIP_SHEETS_PREFIX = ("Coconut",)


def _row_index(labels: pd.Series, label: str) -> Optional[int]:
    hits = labels[labels == label].index
    return int(hits[0]) if len(hits) else None


def _num(value) -> Optional[float]:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if v > 0 else None


def parse_sheet(sheet: pd.DataFrame, sheet_name: str) -> Optional[dict]:
    header_rows = [
        i for i in range(min(10, len(sheet)))
        if sheet.iloc[i].astype(str).str.contains("States").any()
    ]
    if not header_rows:
        return None
    header = [str(v).strip() for v in sheet.iloc[header_rows[0]].tolist()]
    labels = sheet.iloc[:, 2].astype(str).str.strip()
    items = sheet.iloc[:, 1].astype(str)

    rows = {key: _row_index(labels, key) for key in ("A2", "A2+FL", "C2")}
    if any(r is None for r in rows.values()):
        return None
    holdings_rows = items[items.str.contains("Number of Holdings", na=False)].index
    yield_rows = items[items.str.contains("Derived Yield", na=False)].index

    # State columns start after the "A1/A2/..." label column
    state_cols = {
        i: name for i, name in enumerate(header)
        if i >= 3 and name not in ("nan", "") and "all india" not in name.lower()
    }
    if not state_cols:
        return None

    def col_values(col: int) -> dict:
        return {
            "a2": _num(sheet.iat[rows["A2"], col]),
            "a2fl": _num(sheet.iat[rows["A2+FL"], col]),
            "c2": _num(sheet.iat[rows["C2"], col]),
            "holdings": _num(sheet.iat[holdings_rows[0], col]) if len(holdings_rows) else None,
            "yield_q": _num(sheet.iat[yield_rows[0], col]) if len(yield_rows) else None,
        }

    karnataka_col = next((c for c, n in state_cols.items() if TARGET_STATE in n.lower()), None)
    if karnataka_col is not None and col_values(karnataka_col)["a2"]:
        vals = col_values(karnataka_col)
        basis, n_states = "karnataka", 1
    else:
        per_state = [col_values(c) for c in state_cols]
        per_state = [v for v in per_state if v["a2"]]
        if not per_state:
            return None
        frame = pd.DataFrame(per_state)
        vals = {
            "a2": float(frame["a2"].median()),
            "a2fl": float(frame["a2fl"].median()),
            "c2": float(frame["c2"].median()),
            "holdings": float(frame["holdings"].sum()) if frame["holdings"].notna().any() else None,
            "yield_q": float(frame["yield_q"].median()) if frame["yield_q"].notna().any() else None,
        }
        basis, n_states = "median_of_surveyed_states", len(per_state)

    crop = SHEET_TO_CROP.get(sheet_name) or normalize_crop(sheet_name) or sheet_name
    return {
        "crop": crop,
        "des_sheet": sheet_name,
        "cost_basis": basis,
        "states_in_basis": n_states,
        "a2_inr_per_ha": round(vals["a2"], 0),
        "a2fl_inr_per_ha": round(vals["a2fl"], 0) if vals["a2fl"] else None,
        "c2_inr_per_ha": round(vals["c2"], 0) if vals["c2"] else None,
        "holdings_sampled": int(vals["holdings"]) if vals["holdings"] else None,
        "derived_yield_q_per_ha": round(vals["yield_q"], 1) if vals["yield_q"] else None,
        "source_year": SOURCE_YEAR,
        "source": SOURCE_LABEL,
    }


def build_cost_table(xlsx_path: Path) -> pd.DataFrame:
    workbook = pd.ExcelFile(xlsx_path)
    records = []
    for name in workbook.sheet_names:
        if name.startswith(SKIP_SHEETS_PREFIX):
            continue
        rec = parse_sheet(pd.read_excel(workbook, sheet_name=name, header=None), name)
        if rec is None:
            logger.warning("Could not parse DES sheet '%s'; skipped.", name)
            continue
        records.append(rec)
    return pd.DataFrame(records).sort_values("crop").reset_index(drop=True)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("xlsx", type=Path, help="DES CS-Consolidated-Crop-year-wise workbook")
    parser.add_argument("--out", type=Path, default=DATA_DIR / CULTIVATION_COSTS_CSV)
    args = parser.parse_args()

    table = build_cost_table(args.xlsx)
    table.to_csv(args.out, index=False)
    logger.info("Wrote %d crops to %s (%d Karnataka-specific).",
                len(table), args.out, int((table["cost_basis"] == "karnataka").sum()))


if __name__ == "__main__":
    main()
