"""
data_pipeline/imd_rainfall.py — District × season rainfall from IMD gridded data.

Source: India Meteorological Department, Pune — daily gridded rainfall, 0.25° × 0.25°
        (Pai et al. 2014), one binary .grd file per year.
        Download page: https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html
        (POST rain=<year> to https://www.imdpune.gov.in/cmpg/Griddata/rainfall.php)

Grid: 129 latitudes (6.5–38.5 N) × 135 longitudes (66.5–100.0 E), float32,
      little-endian, -999 = no data (ocean/outside India), one layer per day.

For each district we average the 3 × 3 cells (±0.25°) around the district
headquarters, total the rainfall per season and year, then take the 25th
percentile across years. P25 is deliberately conservative: a farmer planning
on it will be short of rain in only about 1 season in 4.

Seasons: kharif = Jun–Sep, rabi = Oct–Jan (crosses the year end), summer = Mar–May.

Usage (from backend/):
    python -m crop_optimization.data_pipeline.imd_rainfall <folder with YYYY.grd files>
"""

from __future__ import annotations

import argparse
import calendar
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from crop_optimization.config import DATA_DIR, IMD_RAINFALL_CSV

logger = logging.getLogger(__name__)

N_LAT, N_LON = 129, 135
LAT0, LON0, STEP = 6.5, 66.5, 0.25
MISSING = -999.0
NEIGHBOURHOOD = 1  # cells each side → 3 × 3 block

# District headquarters (lat, lon), canonical district names
DISTRICT_HQ: dict[str, tuple[float, float]] = {
    "Bagalkote": (16.18, 75.70), "Ballari": (15.14, 76.92), "Belagavi": (15.85, 74.50),
    "Bengaluru Rural": (13.29, 77.54), "Bengaluru Urban": (12.97, 77.59), "Bidar": (17.91, 77.52),
    "Chamarajanagar": (11.92, 76.94), "Chikkaballapur": (13.43, 77.73), "Chikkamagaluru": (13.32, 75.77),
    "Chitradurga": (14.23, 76.40), "Dakshina Kannada": (12.87, 74.88), "Davanagere": (14.46, 75.92),
    "Dharwad": (15.46, 75.01), "Gadag": (15.43, 75.63), "Hassan": (13.00, 76.10),
    "Haveri": (14.79, 75.40), "Kalaburagi": (17.33, 76.83), "Kodagu": (12.42, 75.74),
    "Kolar": (13.14, 78.13), "Koppal": (15.35, 76.15), "Mandya": (12.52, 76.90),
    "Mysuru": (12.30, 76.64), "Raichur": (16.20, 77.36), "Ramanagara": (12.72, 77.28),
    "Shivamogga": (13.93, 75.57), "Tumakuru": (13.34, 77.10), "Udupi": (13.34, 74.75),
    "Uttara Kannada": (14.80, 74.13), "Vijayapura": (16.83, 75.71), "Yadgir": (16.77, 77.14),
    "Vijayanagara": (15.27, 76.39),
}

# season -> list of (year_offset, month)
SEASON_MONTHS: dict[str, list[tuple[int, int]]] = {
    "kharif": [(0, m) for m in (6, 7, 8, 9)],
    "rabi": [(0, 10), (0, 11), (0, 12), (1, 1)],
    "summer": [(0, m) for m in (3, 4, 5)],
}


def read_grd(path: Path, year: int) -> np.ndarray:
    """Return daily rainfall array of shape (days, N_LAT, N_LON) with NaN for missing."""
    days = 366 if calendar.isleap(year) else 365
    data = np.fromfile(path, dtype="<f4")
    if data.size != days * N_LAT * N_LON:
        raise ValueError(f"{path.name}: unexpected size {data.size} for {days} days")
    data = data.reshape(days, N_LAT, N_LON).astype(float)
    data[data <= MISSING + 1] = np.nan
    return data


def cell_index(lat: float, lon: float) -> tuple[int, int]:
    return int(round((lat - LAT0) / STEP)), int(round((lon - LON0) / STEP))


def monthly_totals(daily: np.ndarray, year: int, lat: float, lon: float) -> dict[int, float]:
    """Month → rainfall total (mm) for the 3×3 block around (lat, lon)."""
    i, j = cell_index(lat, lon)
    block = daily[:, i - NEIGHBOURHOOD:i + NEIGHBOURHOOD + 1, j - NEIGHBOURHOOD:j + NEIGHBOURHOOD + 1]
    series = np.nanmean(block.reshape(block.shape[0], -1), axis=1)
    dates = pd.date_range(f"{year}-01-01", periods=len(series), freq="D")
    return pd.Series(series, index=dates).groupby(dates.month).sum().to_dict()


def build_rainfall_table(grd_dir: Path) -> pd.DataFrame:
    files = {int(p.stem): p for p in sorted(Path(grd_dir).glob("*.grd")) if p.stem.isdigit()}
    if not files:
        raise FileNotFoundError(f"No YYYY.grd files in {grd_dir}")

    # monthly[(district, year)][month] = mm
    monthly: dict[tuple[str, int], dict[int, float]] = {}
    for year, path in files.items():
        daily = read_grd(path, year)
        for district, (lat, lon) in DISTRICT_HQ.items():
            monthly[(district, year)] = monthly_totals(daily, year, lat, lon)
        logger.info("Processed %d", year)

    years = sorted(files)
    rows = []
    for district in DISTRICT_HQ:
        for season, months in SEASON_MONTHS.items():
            totals = []
            for y in years:
                needed = [(y + off, m) for off, m in months]
                if all((district, yy) in monthly for yy, _ in needed):
                    totals.append(sum(monthly[(district, yy)][m] for yy, m in needed))
            if not totals:
                continue
            arr = np.array(totals)
            rows.append({
                "district": district,
                "season": season,
                "n_years": len(arr),
                "first_year": years[0],
                "last_year": years[-1],
                "p25_mm": round(float(np.percentile(arr, 25)), 1),
                "median_mm": round(float(np.median(arr)), 1),
                "mean_mm": round(float(arr.mean()), 1),
                "min_mm": round(float(arr.min()), 1),
                "source": "IMD Pune 0.25deg gridded daily rainfall",
            })
    return pd.DataFrame(rows)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(description="Build district × season rainfall table from IMD .grd files")
    parser.add_argument("grd_dir", type=Path)
    parser.add_argument("--out", type=Path, default=DATA_DIR / IMD_RAINFALL_CSV)
    args = parser.parse_args()
    table = build_rainfall_table(args.grd_dir)
    table.to_csv(args.out, index=False)
    logger.info("Wrote %d district-season rows to %s", len(table), args.out)


if __name__ == "__main__":
    main()
