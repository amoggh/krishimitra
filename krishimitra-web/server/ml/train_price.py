"""
Train the harvest-price forecaster on real Karnataka AGMARKNET history (data/price_monthly.csv,
built by ml/fetch_price_history.py: every market and trading day since 2001).

Target    log(price[t+h] / price[t]) for h = 1..9 months
Model     one global HistGradientBoostingRegressor across crops (absolute-error loss)
Features  see app/services/price_features.py

Honest evaluation: a walk-forward backtest over four separate 2-year windows (2018-12 onwards).
For each window the model is trained only on data before it (targets included), then scored on
the window against two simple rules: "no change from today" and "today's price moved by the usual
seasonal swing". Results are reported per window, per horizon and per crop.

The forecast band is the 10th-90th percentile of the model's own out-of-sample errors in the
earlier windows (per crop and horizon group). Its coverage is checked on the latest window,
which the band never saw.

A per-crop "best method" picker was also tried. It chased noise (worse than the plain model on
the test window), so it was dropped.

Usage (from server/):  python ml/train_price.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.services.price_features import FEATURES, METHOD_LABELS, METHODS, h_group, make_dict, seasonal_index  # noqa: E402

MIN_MONTHS, MAX_H, WINDOW = 36, 9, 24
GROUPS = ["1-3", "4-6", "7-9"]


def load() -> pd.DataFrame:
    m = pd.read_csv(ROOT / "data" / "price_monthly.csv")
    if "markets" in m:
        m = m[m.markets >= 2]                              # a month needs prices from at least two markets
    else:
        m = m[m.n >= 2]
    m["period"] = pd.PeriodIndex(m.month, freq="M")
    out = []
    for crop, g in m.groupby("crop"):
        s = g.set_index("period").modal.sort_index()
        s = s.reindex(pd.period_range(s.index.min(), s.index.max(), freq="M")).interpolate(limit=2, limit_area="inside").dropna()
        if len(s) >= MIN_MONTHS:
            out.append(pd.DataFrame({"crop": crop, "period": s.index, "modal": s.values}))
    if not out:
        sys.exit(f"Not enough history yet: every crop needs at least {MIN_MONTHS} months. Run ml/fetch_price_history.py first.")
    return pd.concat(out, ignore_index=True)


def samples(df, seasonal, crops, origin_min=None, origin_max=None, target_max=None) -> pd.DataFrame:
    rows = []
    for crop, g in df.groupby("crop"):
        s = g.set_index("period").modal.sort_index()
        for i in range(12, len(s)):
            origin = s.index[i]
            if origin_max is not None and origin > origin_max:
                break
            if origin_min is not None and origin < origin_min:
                continue
            if (s.index[i] - s.index[i - 12]).n != 12:      # needs an unbroken year of history
                continue
            hist = s.iloc[max(0, i - 36): i + 1]
            for h in range(1, MAX_H + 1):
                tgt = origin + h
                if tgt not in s.index or (target_max is not None and tgt > target_max):
                    continue
                d = make_dict(seasonal, crops, crop, hist, h)
                d.update(crop=crop, origin=str(origin), p0=float(s.iloc[i]), p1=float(s[tgt]), y=float(np.log(s[tgt] / s.iloc[i])))
                rows.append(d)
    return pd.DataFrame(rows)


def fit(S: pd.DataFrame) -> HistGradientBoostingRegressor:
    m = HistGradientBoostingRegressor(loss="absolute_error", max_iter=400, learning_rate=.03, max_leaf_nodes=15,
                                      min_samples_leaf=40, l2_regularization=1.0, categorical_features=[0], random_state=3)
    return m.fit(S[FEATURES], S.y)


def score(model, S: pd.DataFrame) -> pd.DataFrame:
    """Absolute % error and log residual of every method on every sample."""
    ml = model.predict(S[FEATURES])
    out = S[["crop", "h", "origin", "p0", "p1", "y"]].copy()
    out["g"] = out.h.map(h_group)
    for name, f in METHODS.items():
        pred = np.array([f(x, m) for x, m in zip(S.to_dict("records"), ml)])
        out[f"ape_{name}"] = np.abs(np.exp(pred) * out.p0 - out.p1) / out.p1
        out[f"res_{name}"] = out.y - pred
    return out


def bands(sc: pd.DataFrame, crops) -> dict:
    """10th/90th percentile of the model's out-of-sample log errors, per crop and horizon group."""
    out = {}
    for c in crops:
        out[c] = {}
        for g in GROUPS:
            r = sc[(sc.crop == c) & (sc.g == g)].res_model
            if len(r) < 20:
                r = sc[sc.g == g].res_model
            out[c][g] = [float(r.quantile(.1)), float(r.quantile(.9))]
    return out


pct = lambda s: round(float(s.median() * 100), 1)


def walk_forward(df, crops, n_windows=4) -> pd.DataFrame:
    last = df.period.max()
    parts = []
    for k in range(n_windows):
        end = last - WINDOW * k
        start = end - WINDOW + 1
        seas = seasonal_index(df[df.period < start])
        tr = samples(df, seas, crops, target_max=start - 1)
        te = samples(df, seas, crops, origin_min=start, origin_max=end)
        sc = score(fit(tr), te)
        sc["window"] = f"{start} to {end}"
        parts.append(sc)
        print(f"  window {start}..{end}: trained on {len(tr):,} samples, tested on {len(te):,}", flush=True)
    return pd.concat(parts, ignore_index=True)


def main():
    df = load()
    crops = sorted(df.crop.unique())
    last = df.period.max()
    print(f"{len(df)} crop-months, {df.period.min()} to {last}. Walk-forward backtest:")
    bt = walk_forward(df, crops)
    windows = list(dict.fromkeys(bt.window))           # newest first
    latest = bt[bt.window == windows[0]]
    earlier = bt[bt.window != windows[0]]

    cols = {"model": "ape_model", "no_change": "ape_no_change", "seasonal_naive": "ape_seasonal"}
    summ = lambda d: {k: pct(d[v]) for k, v in cols.items()}
    by_window = {w: summ(g) | {"h3_9": summ(g[g.h >= 3])} for w, g in bt.groupby("window", sort=False)}
    by_h = {int(h): summ(g) for h, g in bt.groupby("h")}
    by_crop = {c: summ(g) | {"n": int(len(g))} for c, g in bt.groupby("crop")}
    by_crop_h = {c: {int(h): pct(gg.ape_model) for h, gg in g.groupby("h")} for c, g in bt.groupby("crop")}

    # Band calibrated on earlier windows, coverage checked on the latest one.
    b_early = bands(earlier, crops)
    lo = np.array([b_early[c][g][0] for c, g in zip(latest.crop, latest.g)])
    hi = np.array([b_early[c][g][1] for c, g in zip(latest.crop, latest.g)])
    coverage = float(((latest.res_model >= lo) & (latest.res_model <= hi)).mean())

    # Deployment: model on all data, band from all out-of-sample errors.
    seasonal = seasonal_index(df)
    tr_all = samples(df, seasonal, crops)
    pick = {c: {g: "model" for g in GROUPS} for c in crops}
    bundle = {"model": fit(tr_all), "seasonal": seasonal, "crops": crops, "pick": pick, "band": bands(bt, crops),
              "horizon_error": by_crop_h, "horizon_error_all": {int(h): v["model"] for h, v in by_h.items()}}
    (ROOT / "models").mkdir(exist_ok=True)
    joblib.dump(bundle, ROOT / "models" / "price_model.joblib")
    metrics = {
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "model": "Gradient-boosted model on log price change, one model across crops",
        "data": "AGMARKNET Karnataka, every market and trading day, monthly median modal price (data.gov.in)",
        "crops_used": crops, "months_by_crop": {c: int((df.crop == c).sum()) for c in crops},
        "first_month": str(df.period.min()), "last_month": str(last),
        "backtest_window": f"{windows[-1].split(' to ')[0]} to {last} (4 walk-forward windows of 24 months)",
        "train_samples": int(len(tr_all)), "backtest_samples": int(len(bt)),
        "backtest_overall": summ(bt), "backtest_latest": summ(latest), "backtest_by_window": by_window,
        "backtest_by_horizon": by_h, "backtest_by_crop": by_crop,
        "band_coverage_10_90": round(coverage * 100, 1), "deployed_methods": pick, "method_labels": METHOD_LABELS,
    }
    (ROOT / "models" / "price_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf8")

    print("\nMedian % error on unseen prices (lower is better)")
    print(f"  {'':24s} {'model':>7s} {'no change':>10s} {'seasonal':>9s}")
    row = lambda name, v: print(f"  {name:24s} {v['model']:7.1f} {v['no_change']:10.1f} {v['seasonal_naive']:9.1f}")
    row("ALL 4 windows", metrics["backtest_overall"])
    for w, v in by_window.items():
        row(w, v)
    for h, v in by_h.items():
        row(f"h={h}", v)
    for c, v in by_crop.items():
        row(c, v)
    print(f"\n10-90% band (from earlier windows) held {metrics['band_coverage_10_90']}% of prices in the latest window (80% is ideal).")


if __name__ == "__main__":
    main()
