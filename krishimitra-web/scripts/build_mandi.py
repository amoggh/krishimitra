"""Summarise the AGMARKNET extract (one trading day, 8,914 rows, 21 states) for the Mandi tab."""
import json
import pandas as pd

SRC = r"D:/KrishiMitra_project/krishimitra/backend/data/mandi prices data.csv"
m = pd.read_csv(SRC)
m.columns = ["State", "District", "Market", "Commodity", "Variety", "Grade", "Date", "Min", "Max", "Modal"]
m["State"] = m.State.replace({"Keralam": "Kerala", "Chattisgarh": "Chhattisgarh", "NCT of Delhi": "Delhi"})
TOTAL = len(m)
# Uzhavar Sandhai are Tamil Nadu farmer-to-consumer markets: retail-style prices, not comparable with APMC wholesale.
retail = m.Market.str.contains("Uzhavar", case=False)
RETAIL = int(retail.sum())
m = m[~retail]

# display label -> (source commodity names, planner crop id)
WANT = {
    "Tomato": (["Tomato"], "tomato"), "Onion": (["Onion"], "onion"), "Potato": (["Potato"], None),
    "Green Chilli": (["Green Chilli"], None), "Brinjal": (["Brinjal"], None), "Cabbage": (["Cabbage"], None),
    "Carrot": (["Carrot"], None), "Banana": (["Banana"], None), "Coconut": (["Coconut"], None),
    "Ginger": (["Ginger(Green)"], None), "Garlic": (["Garlic"], None), "Wheat": (["Wheat"], None),
    "Paddy": (["Paddy(Common)"], "paddy"), "Maize": (["Maize"], "maize"), "Groundnut": (["Groundnut"], "groundnut"),
    "Bengal Gram": (["Bengal Gram(Gram)(Whole)"], "chickpea"), "Green Gram": (["Green Gram(Moong)(Whole)"], "greengram"),
    "Tur": (["Red gram/Arhar/Tur(whole)"], "tur"), "Jowar": (["Jowar(Sorghum)"], "jowar"), "Ragi": (["Ragi(Finger Millet)"], "ragi"),
    "Cotton": (["Cotton"], "cotton"), "Sunflower": (["Sunflower/Sunflower Seed", "Sunflower"], "sunflower"),
    "Soyabean": (["Soyabean"], None), "Mustard": (["Mustard"], None),
}
out = {}
for label, (names, crop) in WANT.items():
    g = m[m.Commodity.isin(names)]
    if len(g):  # drop obvious entry errors (e.g. modal price of 1 or 29)
        med = g.Modal.median()
        g = g[(g.Modal >= 0.1 * med) & (g.Modal <= 5 * med) & (g.Min > 0)]
    if g.empty:
        print("MISSING", label); continue
    states = {}
    for s, h in g.groupby("State"):
        best = h.loc[h.Modal.idxmax()]
        states[s] = dict(median=round(float(h.Modal.median())), n=int(len(h)), lo=round(float(h.Modal.min())), hi=round(float(h.Modal.max())), best=best.Market)
    rows = g.sort_values("Modal", ascending=False)
    state_best = g.loc[g.groupby("State").Modal.idxmax()]
    pick = pd.concat([rows.head(8), rows.tail(8), rows[rows.State == "Karnataka"], state_best]).drop_duplicates()
    markets = [dict(market=r.Market, district=r.District, state=r.State, min=round(float(r.Min)), max=round(float(r.Max)), modal=round(float(r.Modal)), variety=r.Variety)
               for r in pick.sort_values("Modal", ascending=False).itertuples()]
    out[label] = dict(crop=crop, median=round(float(g.Modal.median())), n=int(len(g)), nStates=int(g.State.nunique()),
                      lo=round(float(g.Modal.min())), hi=round(float(g.Modal.max())),
                      spread=round(float(((g.Max - g.Min) / g.Modal.where(g.Modal > 0)).median() * 100), 1), states=states, markets=markets)
    print(f"{label:14s} n={len(g):4d} states={g.State.nunique():2d} median={out[label]['median']:6d} range={out[label]['lo']}-{out[label]['hi']} KA={'Karnataka' in states}")
meta = dict(date=m.Date.iloc[0], total=TOTAL, retail=RETAIL, rows=int(len(m)), states=int(m.State.nunique()), markets=int(m.Market.nunique()), commodities=int(m.Commodity.nunique()))
json.dump(dict(meta=meta, items=out), open("src/data/mandi.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(meta)
