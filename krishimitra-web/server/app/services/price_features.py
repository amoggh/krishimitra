"""Feature engineering shared by ml/train_price.py and the live forecaster, so both stay identical."""
from __future__ import annotations

import numpy as np
import pandas as pd

FEATURES = ["crop_code", "h", "m_sin", "m_cos", "season_move", "season_gap",
            "mom1", "mom3", "mom12", "level12", "level36", "vol12"]

# Forecasting methods compared in the backtest. Each maps the features (and the ML model's prediction)
# to a predicted log price change from today to h months ahead.
METHODS = {
    "model": lambda x, ml: ml,                              # gradient-boosted model
    "model_half": lambda x, ml: 0.5 * ml,                   # model, shrunk halfway towards "no change"
    "no_change": lambda x, ml: 0.0,                         # the price stays where it is today
    "seasonal": lambda x, ml: x["season_move"],             # today's price moved by the crop's usual seasonal swing
    "seasonal_half": lambda x, ml: 0.5 * x["season_move"],  # half the usual seasonal swing
}
METHOD_LABELS = {
    "model": "Machine-learning model",
    "model_half": "Machine-learning model, damped",
    "no_change": "No change from today",
    "seasonal": "Usual seasonal swing",
    "seasonal_half": "Half the usual seasonal swing",
}


def h_group(h: int) -> str:
    return "1-3" if h <= 3 else "4-6" if h <= 6 else "7-9"


def seasonal_index(monthly: pd.DataFrame) -> dict[str, list[float]]:
    """Per crop: median of log(price / centred 12-month mean) by calendar month (0 = Jan)."""
    out = {}
    for crop, g in monthly.groupby("crop"):
        s = g.set_index("period").modal.sort_index()
        trend = s.rolling(12, center=True, min_periods=9).mean()
        dev = np.log(s / trend).dropna()
        by_m = dev.groupby(dev.index.month).median()
        vals = [float(by_m.get(m, 0.0)) for m in range(1, 13)]
        mean = float(np.mean(vals))
        out[crop] = [v - mean for v in vals]
    return out


def make_dict(seasonal: dict, crops: list[str], crop: str, s: pd.Series, h: int) -> dict:
    """Features at the last point of series `s` (PeriodIndex, monthly) for a forecast `h` months ahead."""
    last = s.index.max()
    target = last + h
    idx = seasonal.get(crop, [0.0] * 12)
    logs = np.log(s.values[-37:])
    tail12 = logs[-12:]
    level12 = logs[-1] - tail12.mean()
    return {
        "crop_code": crops.index(crop),
        "h": h,
        "m_sin": np.sin(2 * np.pi * (target.month - 1) / 12),
        "m_cos": np.cos(2 * np.pi * (target.month - 1) / 12),
        "season_move": idx[target.month - 1] - idx[last.month - 1],
        "season_gap": level12 - idx[last.month - 1],          # how far today's price sits from its seasonal norm
        "mom1": logs[-1] - logs[-2] if len(logs) >= 2 else 0.0,
        "mom3": logs[-1] - logs[-4] if len(logs) >= 4 else 0.0,
        "mom12": logs[-1] - logs[-13] if len(logs) >= 13 else 0.0,
        "level12": level12,
        "level36": logs[-1] - logs[-36:].mean(),
        "vol12": float(np.std(np.diff(tail12))) if len(tail12) > 2 else 0.0,
    }


def make_row(seasonal: dict, crops: list[str], crop: str, s: pd.Series, h: int) -> pd.DataFrame:
    return pd.DataFrame([make_dict(seasonal, crops, crop, s, h)])[FEATURES]
