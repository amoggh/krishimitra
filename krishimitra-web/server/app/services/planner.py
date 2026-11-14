"""
Crop planner: water budget -> agronomic filter -> yield (ML) and price (forecast/live) ->
Monte-Carlo profit simulation -> Pareto search over land splits.

Keeps the constants of the original KrushiMitra crop_optimization/config.py.
"""
from __future__ import annotations

import hashlib
import json
import math

import numpy as np

from app.services import forecast, mandi, yield_model
from app.services.knowledge import MONTHS, START_MONTH, crops, districts, harvest_month

PUMP_LPH_PER_HP = {1: (500, 800), 2: (1000, 1600), 3: (1500, 2400), 5: (2500, 4000), 7.5: (3750, 6000), 10: (5000, 8000)}
IRR_EFF = {"flood": .55, "sprinkler": .80, "drip": .92}
EFFECTIVE_RAIN, DEEP_FT, DEEP_PENALTY, PUMP_DAYS = .70, 300, .85, 120
SOIL_STORE_MM, SOIL_STORE_BLACK_MM = 60, 120
M3_PER_MM_ACRE = 4.047
MAX_SINGLE, MIN_AREA, N_SIM = .60, .25, 500
EXPERIENCE = {"none": {"label": "never farmed", "factor": .90, "maxDiff": 3, "maxCrops": 3},
              "some": {"label": "a little", "factor": .97, "maxDiff": 4, "maxCrops": 4},
              "pro": {"label": "for years", "factor": 1.05, "maxDiff": 5, "maxCrops": 5}}
# Crops that Karnataka farmers mostly grow under irrigation, so district averages already include irrigation.
USUALLY_IRRIGATED = {"paddy", "sugarcane", "onion", "tomato", "turmeric"}


def inr(n: float) -> str:
    s, sign = round(abs(n)), "-" if n < 0 else ""
    if s >= 10_000_000: return f"{sign}₹{s / 10_000_000:.2f} Cr"
    if s >= 100_000: return f"{sign}₹{s / 100_000:.2f} L"
    return f"{sign}₹{s:,}"


def water_budget(inp: dict) -> dict:
    if inp["source"] == "rainfed":
        return {"supplyM3": 0.0, "note": "Rain only. No irrigation source declared.", "daily": 0}
    if inp["source"] == "canal":
        return {"supplyM3": math.inf, "note": "Canal / river command area: water treated as assured (check release schedule).", "daily": None}
    lo, hi = PUMP_LPH_PER_HP.get(inp["hp"], PUMP_LPH_PER_HP[5])
    daily = (lo + hi) / 2 * inp["hours"] * (DEEP_PENALTY if inp.get("depthFt", 0) > DEEP_FT else 1)
    eff = IRR_EFF.get(inp["irrigation"], .55)
    return {"supplyM3": daily / 1000 * PUMP_DAYS * eff, "daily": daily, "eff": eff, "pumpDays": PUMP_DAYS,
            "note": f"{inp['hp']} HP pump x {inp['hours']} h/day = {round(daily):,} L/day. Over {PUMP_DAYS} pumping days at {round(eff * 100)}% {inp['irrigation']} efficiency."}


def season_rain(district: str, season: str, days: int) -> float:
    m, left, total = START_MONTH[season] - 1, days, 0.0
    monthly = districts()[district]["monthly"]
    while left > 0:
        total += monthly[m % 12] * min(30, left) / 30
        left -= 30; m += 1
    return total


def crop_window(season: str, days: int) -> dict:
    s, n = START_MONTH[season] - 1, min(12, -(-days // 30))
    return {"sow": MONTHS[s], "harvest": MONTHS[(s + n) % 12], "months": n}


def evaluate_crops(inp: dict):
    d, wb, ex = districts()[inp["district"]], water_budget(inp), EXPERIENCE[inp["experience"]]
    store = SOIL_STORE_BLACK_MM if ("Black" in d["soil"] or "Shallow" in d["soil"]) else SOIL_STORE_MM
    top_map = {"Finger Millet": ["ragi"], "Maize": ["maize"], "Groundnut": ["groundnut"], "Pulses": ["tur", "chickpea", "greengram"], "Sorghum": ["jowar"],
               "Rice": ["paddy"], "Cotton": ["cotton"], "Onion": ["onion"], "Sugarcane": ["sugarcane"]}
    top_ids = {i for n in d.get("top_crops", []) for i in top_map.get(n, [])}
    accepted, rejected = [], []
    for c in crops():
        rain_only = season_rain(inp["district"], inp["season"], c["days"]) * EFFECTIVE_RAIN + store
        rain = min(c["etc"], rain_only)
        base = {"crop": c, "rain": rain, "deficit": max(0.0, c["etc"] - rain), "window": crop_window(inp["season"], c["days"])}
        def no(why, tag): rejected.append({**base, "why": why, "tag": tag})
        if inp["season"] not in c["seasons"]:
            no(f"Not a {inp['season']} crop. It is sown in {' or '.join(c['seasons'])}.", "Season"); continue
        if c["difficulty"] > ex["maxDiff"]:
            no(f"Rated {c['difficulty']}/5 for difficulty. Too demanding when you have farmed {ex['label']}. Revisit in a later season.", "Skill"); continue
        if d["ph"] < c["ph"][0] - .3 or d["ph"] > c["ph"][1] + .3:
            no(f"{inp['district']} soil pH {d['ph']} is outside the {c['ph'][0]}-{c['ph'][1]} range this crop tolerates.", "Soil"); continue
        irr_mm = math.inf if wb["supplyM3"] == math.inf else wb["supplyM3"] / min(inp["acres"], 1) / M3_PER_MM_ACRE
        best = min(1.0, (rain + irr_mm) / c["etc"])
        if best < c["minCover"]:
            extra = f" and your pump could add {round(irr_mm)} mm on one acre" if wb["supplyM3"] > 0 else " and you have no irrigation"
            no(f"Needs about {c['etc']} mm of water, rain supplies about {round(rain)} mm{extra}. Falls short of the {round(c['minCover'] * 100)}% minimum.", "Water"); continue
        if c["cost"] * MIN_AREA > inp["budget"]:
            no(f"Even a quarter-acre costs {inr(c['cost'] * MIN_AREA)}. That is above your budget.", "Budget"); continue
        soil = "good" if d["soil"] in c["good"] else "poor" if d["soil"] in c["poor"] else "fair"
        typical_cover = .9 if c["id"] in USUALLY_IRRIGATED else min(1.0, rain_only / c["etc"])
        accepted.append({**base, "soilNote": soil, "inDistrictTop": c["id"] in top_ids, "typicalCover": typical_cover})
    return accepted, rejected, wb


def attach_yield_and_price(accepted: list[dict], inp: dict) -> None:
    ml = yield_model.predict(inp["district"], [a["crop"]["id"] for a in accepted], inp["season"])
    ex = EXPERIENCE[inp["experience"]]
    err = (yield_model.metrics().get("time_split_2017", {}).get("model_only", {}).get("mape_pct") or 25) / 100
    for a in accepted:
        c = a["crop"]
        if c["id"] in ml:
            a["yieldSource"] = {"kind": "ml", "label": "District yield model", "qtlPerAcre": ml[c["id"]]["qtl_per_acre"], "validationErrorPct": round(err * 100)}
            a["yBase"], a["yVol"], a["relative"] = ml[c["id"]]["qtl_per_acre"] * ex["factor"], max(c["yVol"], err * 1.1), True
        else:
            soil = 1.05 if a["soilNote"] == "good" else .85 if a["soilNote"] == "poor" else 1
            a["yieldSource"] = {"kind": "curated", "label": "Curated benchmark (no training data for this crop)", "qtlPerAcre": c["yield"][1]}
            a["yBase"], a["yVol"], a["relative"] = c["yield"][1] * soil * ex["factor"], c["yVol"], False
        hm = harvest_month(inp["season"], c["days"])
        a["price"] = forecast.price_at_harvest(c, hm)


def _rng(inp: dict) -> np.random.Generator:
    return np.random.default_rng(int(hashlib.sha256(json.dumps(inp, sort_keys=True).encode()).hexdigest()[:12], 16))


def build_sims(accepted: list[dict], rng: np.random.Generator) -> None:
    z = rng.standard_normal(N_SIM)
    rho = .55
    for a in accepted:
        c, pr = a["crop"], a["price"]
        e1, e2, e3 = rng.standard_normal((3, N_SIM))
        a["yN"] = np.exp(a["yVol"] * (rho * z + math.sqrt(1 - rho ** 2) * e1) - a["yVol"] ** 2 / 2)
        p = pr["expected"] * np.exp(pr["sigma"] * e2 - pr["sigma"] ** 2 / 2)
        if c.get("msp"):
            p = np.maximum(p, min(.92 * c["msp"], pr["expected"]))   # procurement floor, never above the expected price
        a["pN"] = p
        a["cN"] = np.exp(.08 * e3)


_MATS: dict[tuple, dict] = {}


def _mats(sims: list[dict]) -> dict:
    """Stack per-crop arrays once so each evaluation is pure numpy."""
    key = tuple(id(x) for x in sims)
    if key not in _MATS:
        if len(_MATS) > 64:
            _MATS.clear()
        _MATS[key] = {
            "R": np.stack([x["yBase"] * x["yN"] * x["pN"] for x in sims]),       # revenue per acre at full yield factor
            "C": np.stack([x["crop"]["cost"] * x["cN"] for x in sims]),          # cost per acre
            "deficit": np.array([x["deficit"] for x in sims]), "rain": np.array([x["rain"] for x in sims]),
            "etc": np.array([x["crop"]["etc"] for x in sims], float), "ky": np.array([x["crop"]["ky"] for x in sims]),
            "rel": np.array([x["relative"] for x in sims]), "tc": np.array([x["typicalCover"] for x in sims]),
            "cost": np.array([x["crop"]["cost"] for x in sims], float),
        }
    return _MATS[key]


def evaluate(sims: list[dict], acres: np.ndarray, wb: dict, keep: bool = False) -> dict:
    M = _mats(sims)
    need = float((acres * M["deficit"]).sum() * M3_PER_MM_ACRE)
    ratio = 1.0 if need <= 0 else min(1.0, wb["supplyM3"] / need)
    cov = np.minimum(1.0, (M["rain"] + ratio * M["deficit"]) / M["etc"])
    yf = np.maximum(.1, 1 - M["ky"] * (1 - cov))
    # ML yields are district averages: scale by water relative to a typical neighbour's.
    rel = np.clip(yf / np.maximum(.1, 1 - M["ky"] * (1 - M["tc"])), .25, 1.5)
    yf = np.where(M["rel"], rel, yf)
    per = acres[:, None] * (yf[:, None] * M["R"] - M["C"])
    port = per.sum(0)
    srt = np.sort(port)
    k = int(N_SIM * .1)
    out = {"mean": float(port.mean()), "cvar": float(srt[:k].mean()), "sorted": srt, "invest": float((acres * M["cost"]).sum()),
           "ratio": ratio, "cov": cov, "yf": yf, "need": need}
    if keep:
        out["perCrop"] = per
    return out


def round_acres(w: np.ndarray, total: float) -> np.ndarray:
    raw = w * total / MIN_AREA
    base = np.floor(raw)
    rem = int(round(total / MIN_AREA) - base.sum())
    for i in np.argsort(-(raw - base))[:max(0, rem)]:
        base[i] += 1
    return base * MIN_AREA


def search(sims, inp, wb, rng):
    n, ex = len(sims), EXPERIENCE[inp["experience"]]
    cap = 1.0 if inp["acres"] < 2 else MAX_SINGLE
    max_k = min(n, ex["maxCrops"], max(1, int(inp["acres"] / MIN_AREA)))
    min_k = 2 if inp["experience"] != "pro" and inp["acres"] >= 2 and n >= 2 else 1
    costs = np.array([s["crop"]["cost"] for s in sims])
    pool, seen = [], set()

    def consider(acres: np.ndarray):
        cost = float((acres * costs).sum())
        if cost > inp["budget"]:
            acres = np.floor(acres * inp["budget"] / cost / MIN_AREA) * MIN_AREA
            if (acres * costs).sum() > inp["budget"] or not acres.any():
                return
        if not acres.any():
            return
        key = tuple(acres)
        if key in seen:
            return
        seen.add(key)
        ev = evaluate(sims, acres, wb)
        pool.append({"acres": acres, "mean": ev["mean"], "cvar": ev["cvar"]})

    for _ in range(600 if n > 8 else 1000):
        k = min(max_k, min_k + int(rng.integers(0, max_k - min_k + 1)))
        if k * cap < 1 - 1e-9:
            continue
        idx = rng.permutation(n)[:k]
        w = rng.exponential(size=k); w /= w.sum()
        for _ in range(6):
            over = np.clip(w - cap, 0, None).sum()
            if over < 1e-9: break
            under = (w < cap).sum()
            w = np.where(w > cap, cap, w + over / max(1, under))
        r = round_acres(w, inp["acres"])
        if (r / inp["acres"] > cap + 1e-9).any():
            continue
        acres = np.zeros(n); acres[idx] = r
        consider(acres)
    for p in pareto(pool)[:6]:
        for i in range(n):
            for j in range(n):
                if i == j or p["acres"][i] < MIN_AREA: continue
                a = p["acres"].copy(); a[i] -= MIN_AREA; a[j] += MIN_AREA
                if a[j] / inp["acres"] > cap + 1e-9 or (a > 0).sum() > max_k: continue
                consider(a)
    return pareto(pool)


def pareto(pool):
    front, best = [], -math.inf
    for p in sorted(pool, key=lambda p: -p["mean"]):
        if p["cvar"] > best + 1:
            front.append(p); best = p["cvar"]
    return sorted(front, key=lambda p: p["mean"])


def describe(sims, acres, inp, wb) -> dict:
    ev = evaluate(sims, acres, wb, keep=True)
    out_crops = []
    for i, s in enumerate(sims):
        if acres[i] <= 0: continue
        sm = np.sort(ev["perCrop"][i])
        yq = acres[i] * s["yBase"] * ev["yf"][i]
        out_crops.append({"crop": s["crop"], "acres": float(acres[i]), "share": float(acres[i] / inp["acres"]), "cost": float(acres[i] * s["crop"]["cost"]),
                          "soilNote": s["soilNote"], "inDistrictTop": s["inDistrictTop"], "coverage": float(ev["cov"][i]), "yieldFactor": float(ev["yf"][i]),
                          "window": s["window"], "rain": s["rain"], "deficit": s["deficit"], "yieldQtl": float(yq), "revenue": float(yq * s["price"]["expected"]),
                          "p10": float(sm[int(.1 * N_SIM)]), "p50": float(sm[int(.5 * N_SIM)]), "p90": float(sm[int(.9 * N_SIM)]), "probLoss": float((sm < 0).mean()),
                          "waterM3": float(acres[i] * s["deficit"] * M3_PER_MM_ACRE * ev["ratio"]), "yieldSource": s["yieldSource"], "price": s["price"]})
    out_crops.sort(key=lambda c: -c["acres"])
    srt, used = ev["sorted"], float(acres.sum())
    q = lambda p: float(srt[min(N_SIM - 1, int(p * N_SIM))])
    bins = 28
    lo, hi = float(srt[0]), float(srt[-1]); w = (hi - lo) / bins or 1
    hist = np.histogram(srt, bins=bins, range=(lo, lo + w * bins))[0].tolist()
    return {"crops": out_crops, "used": used, "fallow": max(0.0, inp["acres"] - used), "invest": ev["invest"], "mean": ev["mean"],
            "p10": q(.1), "p50": q(.5), "p90": q(.9), "cvar": ev["cvar"], "probLoss": float((srt < 0).mean()),
            "roi": ev["mean"] / ev["invest"] if ev["invest"] else 0, "waterNeed": ev["need"], "waterRatio": ev["ratio"],
            "hist": {"lo": lo, "hi": hi, "bins": hist, "w": w}}


def _clean(o):
    if isinstance(o, dict): return {k: _clean(v) for k, v in o.items() if k not in ("yN", "pN", "cN")}
    if isinstance(o, list): return [_clean(v) for v in o]
    if isinstance(o, float) and math.isinf(o): return None
    if isinstance(o, (np.floating,)): return float(o)
    return o


def plan(inp: dict) -> dict:
    accepted, rejected, wb = evaluate_crops(inp)
    district = districts()[inp["district"]]
    if not accepted:
        return _clean({"inp": inp, "wb": wb, "rejected": rejected, "empty": True, "district": district})
    attach_yield_and_price(accepted, inp)
    rng = _rng(inp)
    build_sims(accepted, rng)
    sims = []
    for i, s in enumerate(accepted):   # never recommend a crop that loses money on average at this water level
        a = np.zeros(len(accepted)); a[i] = min(1.0, inp["acres"])
        per_acre = evaluate(accepted, a, wb)["mean"] / a[i]
        if per_acre > 0: sims.append(s)
        else: rejected.append({**s, "tag": "Profit", "why": f"Passes the basic checks, but at this water level it would lose about {inr(-per_acre)} per acre in an average season."})
    if not sims:
        return _clean({"inp": inp, "wb": wb, "rejected": rejected, "empty": True, "district": district})
    front = sorted(search(sims, inp, wb, rng), key=lambda p: -p["cvar"])
    if not front:
        return _clean({"inp": inp, "wb": wb, "rejected": rejected, "empty": True, "district": district})
    if len(front) > 7:
        front = [front[round(i * (len(front) - 1) / 6)] for i in range(7)]
    options = [describe(sims, p["acres"], inp, wb) for p in front]
    singles = []
    for i in range(len(sims)):
        a = np.zeros(len(sims)); a[i] = inp["acres"]; singles.append((evaluate(sims, a, wb)["mean"], i))
    bi = max(singles)[1]
    a = np.zeros(len(sims)); a[bi] = inp["acres"]
    all_in = describe(sims, a, inp, wb)
    per_acre = []
    for i, s in enumerate(sims):
        a = np.zeros(len(sims)); a[i] = 1
        ev = evaluate(sims, a, wb)
        per_acre.append({"id": s["crop"]["id"], "p10": float(ev["sorted"][int(.1 * N_SIM)]), "p50": float(ev["sorted"][int(.5 * N_SIM)]), "mean": ev["mean"]})
    default = int(len(options) * .6) if inp["experience"] == "pro" else int((len(options) - 1) * .35)
    return _clean({"inp": inp, "wb": wb, "rejected": rejected, "options": options, "defaultIdx": default, "allIn": all_in, "allInCrop": sims[bi]["crop"],
                   "perAcre": per_acre, "district": district, "experienceFactor": EXPERIENCE[inp["experience"]]["factor"],
                   "models": {"yield": yield_model.metrics().get("model"), "price": forecast.status()}})
