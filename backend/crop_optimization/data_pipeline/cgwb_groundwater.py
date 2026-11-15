"""
data_pipeline/cgwb_groundwater.py — District groundwater stress table (CGWB / GWRA 2023).

Source: "Dynamic Ground Water Resources of Karnataka 2023" (GWRA 2023, as on March 2023),
        Government of Karnataka with the Central Ground Water Board.
        Annexure VIA: district-wise ground water resource assessment (TMC).
        Copy used: https://data.opencity.in/dataset/dynamic-ground-water-resources-of-karnataka-2023
        (CGWB original: https://cgwb.gov.in — Karnataka state reports)

Stage of extraction (%) = annual extraction for all uses / annual extractable resource.
Category uses the standard CGWB thresholds:
    Safe ≤ 70% < Semi-critical ≤ 90% < Critical ≤ 100% < Over-exploited

Note: official categorisation is per taluk. A district average can hide over-exploited
taluks inside an otherwise "safe" district, so this is a district-level screening flag.

The PDF table is extracted with `pdftotext -raw` (poppler/xpdf); `-layout` mode
mis-aligns rows on the second page, so it must not be used.

Usage (from backend/):
    python -m crop_optimization.data_pipeline.cgwb_groundwater path/to/gwdkargwramarch2023.pdf
"""

from __future__ import annotations

import argparse
import logging
import re
import subprocess
from pathlib import Path

import pandas as pd

from crop_optimization.config import CGWB_GROUNDWATER_CSV, DATA_DIR
from crop_optimization.normalization import normalize_district

logger = logging.getLogger(__name__)

SOURCE_LABEL = "GWRA 2023 - Dynamic Ground Water Resources of Karnataka (CGWB / GoK), Annexure VIA"

# "1 Bagalkot 25.45 22.91 1.55 0.01 17.16 18.72 81.72 1.63 9.63"
ROW_RE = re.compile(r"^(\d{1,2}) ([A-Za-z][A-Za-z ()]+?) ((?:\d+\.\d+ ){8}\d+\.\d+)$")
COLUMNS = [
    "recharge_tmc", "extractable_tmc", "domestic_tmc", "industrial_tmc", "irrigation_tmc",
    "extraction_total_tmc", "stage_of_extraction_pct", "domestic_allocation_2025_tmc", "net_future_tmc",
]

# GWRA spellings not covered by normalize_district
NAME_FIXES = {
    "Kalburgi": "Kalaburagi", "Kolara": "Kolar", "Bagalkot": "Bagalkote",
    "Chamarajanagara": "Chamarajanagar", "Chikkaballapura": "Chikkaballapur",
}


def category_for(stage_pct: float) -> str:
    if stage_pct > 100:
        return "over_exploited"
    if stage_pct > 90:
        return "critical"
    if stage_pct > 70:
        return "semi_critical"
    return "safe"


def parse_annexure_text(text: str) -> pd.DataFrame:
    """Parse district rows of Annexure VIA from `pdftotext -raw` output."""
    rows, seen = [], set()
    for line in text.splitlines():
        m = ROW_RE.match(line.strip())
        if not m:
            continue
        idx, name, numbers = int(m.group(1)), m.group(2).strip(), m.group(3).split()
        if idx in seen or not 1 <= idx <= 31:
            continue
        seen.add(idx)
        raw = re.sub(r"[()]", "", name).strip()
        district = NAME_FIXES.get(raw) or normalize_district(raw) or raw
        rec = {"district": district, "gwra_name": name, **dict(zip(COLUMNS, map(float, numbers)))}
        rec["category"] = category_for(rec["stage_of_extraction_pct"])
        rec["source"] = SOURCE_LABEL
        rows.append(rec)
    return pd.DataFrame(rows)


def extract_text(pdf_path: Path, first_page: int, last_page: int) -> str:
    out = subprocess.run(
        ["pdftotext", "-f", str(first_page), "-l", str(last_page), "-raw", str(pdf_path), "-"],
        check=True, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return out.stdout


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(description="Build district groundwater stress table from GWRA 2023 PDF")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--pages", default="134-135", help="Annexure VIA page range (default 134-135)")
    parser.add_argument("--out", type=Path, default=DATA_DIR / CGWB_GROUNDWATER_CSV)
    args = parser.parse_args()

    first, last = (int(p) for p in args.pages.split("-"))
    table = parse_annexure_text(extract_text(args.pdf, first, last))
    if len(table) != 31:
        raise SystemExit(f"Expected 31 districts, parsed {len(table)} — check the page range.")
    table.to_csv(args.out, index=False)
    logger.info("Wrote %d districts to %s: %s", len(table), args.out,
                table["category"].value_counts().to_dict())


if __name__ == "__main__":
    main()
