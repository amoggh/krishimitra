"""
data_loader.py — Robust, cached data loaders for the 5 real agricultural datasets.

Datasets loaded:
1. karnataka_crop_production_2021_22_yield.csv (Primary recent district-level crop/yield source)
2. ICRISAT-District Level Data - yield.csv      (District-level historical crop yield dataset)
3. crop_yield 1997 to 2020.csv                 (Karnataka-wide historical crop/yield source)
4. mandi prices data.csv                       (Current/recent mandi market prices)
5. karnataka_production_multi_model_dataset_soil_and_mandi.csv (ETc, rainfall, soil, wholesale prices)

Datasets are loaded and cached ONCE at startup to avoid repeated disk reads.
Source CSVs are NEVER modified.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from crop_optimization.config import (
    DATA_DIR,
    HISTORICAL_YIELD_CSV,
    ICRISAT_YIELD_CSV,
    KARNATAKA_2021_CSV,
    MANDI_PRICES_CSV,
    MULTI_MODEL_CSV,
)
from crop_optimization.normalization import (
    normalize_crop,
    normalize_district,
    normalize_season,
)

logger = logging.getLogger(__name__)

# Global dataset cache (in-memory singleton)
_CACHE: dict[str, pd.DataFrame] = {}


def _read_csv_safe(path: Path) -> Optional[pd.DataFrame]:
    """Read CSV safely handling various encodings and whitespace."""
    if not path.exists():
        logger.warning("Dataset not found: %s", path)
        return None

    encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252"]
    for enc in encodings:
        try:
            df = pd.read_csv(path, encoding=enc, low_memory=False)
            logger.info("Successfully read %s (%d rows, encoding=%s)", path.name, len(df), enc)
            return df
        except UnicodeDecodeError:
            continue
        except Exception as exc:
            logger.error("Error reading %s with %s: %s", path.name, enc, exc)
            break

    logger.error("Failed to read %s with any standard encoding.", path.name)
    return None


# ---------------------------------------------------------------------------
# 1. Karnataka 2021-22 Dataset Loader
# ---------------------------------------------------------------------------

def load_karnataka_2021_data(force_reload: bool = False) -> Optional[pd.DataFrame]:
    """
    Load and normalize Karnataka Government 2021-22 dataset.

    Columns produced:
        district_raw, district, crop_raw, crop, season_raw, season,
        area_ha, production_tonnes, yield_kg_ha, yield_t_ha
    """
    if not force_reload and "karnataka_2021" in _CACHE:
        return _CACHE["karnataka_2021"]

    path = DATA_DIR / KARNATAKA_2021_CSV
    raw = _read_csv_safe(path)
    if raw is None:
        return None

    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]

    # Normalize district
    df["district_raw"] = df["District"]
    df["district"] = df["District"].apply(normalize_district)

    # Filter out state total and unmapped rows
    df = df[df["district"].notnull()].copy()

    # Normalize crop
    df["crop_raw"] = df["Crop"]
    df["crop"] = df["Crop"].apply(normalize_crop)
    df = df[df["crop"].notnull()].copy()

    # Normalize season
    df["season_raw"] = df["Season"]
    df["season"] = df["Season"].apply(normalize_season)

    # Convert numerics
    df["area_ha"] = pd.to_numeric(df["Area_Hectares"], errors="coerce").fillna(0.0)
    df["production_tonnes"] = pd.to_numeric(df["Production_Tonnes"], errors="coerce").fillna(0.0)
    df["yield_kg_ha"] = pd.to_numeric(df["Yield_Kg_Hectare"], errors="coerce").fillna(0.0)
    df["yield_t_ha"] = df["yield_kg_ha"] / 1000.0

    _CACHE["karnataka_2021"] = df
    logger.info("Loaded karnataka_2021: %d valid district crop records.", len(df))
    return df


# ---------------------------------------------------------------------------
# 2. ICRISAT District Level Data Loader
# ---------------------------------------------------------------------------

def load_icrisat_data(force_reload: bool = False) -> Optional[pd.DataFrame]:
    """
    Load ICRISAT district-level agricultural data for Karnataka.

    Wide columns include:
        RICE YIELD (Kg per ha), MAIZE YIELD (Kg per ha), etc.
    """
    if not force_reload and "icrisat" in _CACHE:
        return _CACHE["icrisat"]

    path = DATA_DIR / ICRISAT_YIELD_CSV
    raw = _read_csv_safe(path)
    if raw is None:
        return None

    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]

    # Filter Karnataka records
    if "State Name" in df.columns:
        df = df[df["State Name"].astype(str).str.strip().str.upper() == "KARNATAKA"].copy()

    # Normalize district
    if "Dist Name" in df.columns:
        df["district"] = df["Dist Name"].apply(normalize_district)
        df = df[df["district"].notnull()].copy()

    _CACHE["icrisat"] = df
    logger.info("Loaded ICRISAT Karnataka: %d records across %d districts.",
                len(df), df["district"].nunique() if "district" in df.columns else 0)
    return df


# ---------------------------------------------------------------------------
# 3. Karnataka Historical Yield Dataset (1997-2020) Loader
# ---------------------------------------------------------------------------

def load_yield_data(force_reload: bool = False) -> Optional[pd.DataFrame]:
    """
    Load historical state-level crop yield dataset (1997-2020) for Karnataka.

    Columns: Crop, Crop_Year, Season, State, Area, Production, Annual_Rainfall, Yield
    Yield is already in tonnes/hectare.
    """
    if not force_reload and "historical_yield" in _CACHE:
        return _CACHE["historical_yield"]

    path = DATA_DIR / HISTORICAL_YIELD_CSV
    raw = _read_csv_safe(path)
    if raw is None:
        return None

    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]

    # Filter Karnataka
    if "State" in df.columns:
        df = df[df["State"].astype(str).str.strip().str.lower() == "karnataka"].copy()

    # Normalize crop and season
    df["crop_raw"] = df["Crop"]
    df["crop"] = df["Crop"].apply(normalize_crop)
    df = df[df["crop"].notnull()].copy()

    df["season_raw"] = df["Season"]
    df["season"] = df["Season"].apply(normalize_season)

    df["yield_t_ha"] = pd.to_numeric(df["Yield"], errors="coerce")
    df = df[df["yield_t_ha"].notnull() & (df["yield_t_ha"] > 0)].copy()

    _CACHE["historical_yield"] = df
    logger.info("Loaded historical_yield: %d Karnataka records across %d crops.",
                len(df), df["crop"].nunique())
    return df


# ---------------------------------------------------------------------------
# 4. Mandi Prices Dataset Loader
# ---------------------------------------------------------------------------

def load_mandi_data(force_reload: bool = False) -> Optional[pd.DataFrame]:
    """
    Load recent mandi price dataset.

    Prices in INR/quintal.
    """
    if not force_reload and "mandi_prices" in _CACHE:
        return _CACHE["mandi_prices"]

    path = DATA_DIR / MANDI_PRICES_CSV
    raw = _read_csv_safe(path)
    if raw is None:
        return None

    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]

    # Normalize commodity
    if "Commodity" in df.columns:
        df["crop"] = df["Commodity"].apply(normalize_crop)
    else:
        df["crop"] = None

    # District normalization if present
    if "District" in df.columns:
        df["district"] = df["District"].apply(normalize_district)

    # Numeric prices
    for col in ["Modal_x0020_Price", "Min_x0020_Price", "Max_x0020_Price"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Clean standardized column aliases
    if "Modal_x0020_Price" in df.columns:
        df["modal_price_rs_qtl"] = df["Modal_x0020_Price"]
    if "Min_x0020_Price" in df.columns:
        df["min_price_rs_qtl"] = df["Min_x0020_Price"]
    if "Max_x0020_Price" in df.columns:
        df["max_price_rs_qtl"] = df["Max_x0020_Price"]

    _CACHE["mandi_prices"] = df
    logger.info("Loaded mandi_prices: %d records.", len(df))
    return df


# ---------------------------------------------------------------------------
# 5. Multi-Model Dataset Loader (Soil, ETc, Rainfall, Wholesale Prices)
# ---------------------------------------------------------------------------

def load_soil_weather_data(force_reload: bool = False) -> Optional[pd.DataFrame]:
    """
    Load Karnataka multi-model dataset for:
      - Crop_Water_Requirement_ETc_mm
      - Effective_Rainfall_USDA_mm
      - Soil_pH, Soil_Type, NPK
      - Wholesale_Price_Modal_INR_per_Tonne, Min, Max
    """
    if not force_reload and "multi_model" in _CACHE:
        return _CACHE["multi_model"]

    path = DATA_DIR / MULTI_MODEL_CSV
    raw = _read_csv_safe(path)
    if raw is None:
        return None

    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]

    # Normalize district, season, crop
    df["district"] = df["District"].apply(normalize_district)
    df["season"] = df["Season"].apply(normalize_season)
    if "Recommended_Crop" in df.columns:
        df["crop"] = df["Recommended_Crop"].apply(normalize_crop)

    # Numeric fields
    num_cols = [
        "Soil_pH",
        "Crop_Water_Requirement_ETc_mm",
        "Effective_Rainfall_USDA_mm",
        "Rainfall_mm",
        "Temperature_C",
        "Wholesale_Price_Modal_INR_per_Tonne",
        "Wholesale_Price_Min_INR_per_Tonne",
        "Wholesale_Price_Max_INR_per_Tonne",
        "Yield_Tonnes_per_Hectare",
    ]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    _CACHE["multi_model"] = df
    logger.info("Loaded multi_model: %d records.", len(df))
    return df


# ---------------------------------------------------------------------------
# Master Loader
# ---------------------------------------------------------------------------

def load_all_datasets(force_reload: bool = False) -> dict[str, Any]:
    """
    Load and return all 5 real datasets in a dictionary.
    Cached after first load.
    """
    return {
        "karnataka_2021": load_karnataka_2021_data(force_reload),
        "icrisat": load_icrisat_data(force_reload),
        "historical_yield": load_yield_data(force_reload),
        "mandi_prices": load_mandi_data(force_reload),
        "multi_model": load_soil_weather_data(force_reload),
    }
