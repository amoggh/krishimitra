"""Derive per-district soil/climate profiles from the Karnataka multi-model dataset."""
import pandas as pd, json, sys
src = r"D:/KrishiMitra_project/krishimitra/backend/data/karnataka_production_multi_model_dataset_soil_and_mandi.csv"
d = pd.read_csv(src)
out = {}
for name, g in d.groupby("District"):
    # annual rainfall = mean monthly * 12 style estimate using month-grouped means
    monthly = g.groupby("Month").Rainfall_mm.mean()
    out[name] = dict(
        zone=g.Agro_Climatic_Zone.iloc[0],
        soil=g.Soil_Type.mode()[0],
        ph=round(g.Soil_pH.mean(), 1),
        ec=round(g.Soil_Salinity_EC_dS_m.mean(), 2),
        oc=round(g.Soil_Organic_Carbon_Percentage.mean(), 2),
        n=round(g.Nitrogen_Content_kg_ha.mean()),
        p=round(g.Phosphorus_Content_kg_ha.mean()),
        k=round(g.Soil_Salinity_EC_dS_m.mean() and g.Potassium_Content_kg_ha.mean()),
        rain_monthly=[round(float(monthly.get(m, 0))) for m in range(1, 13)],
        temp=round(g.Temperature_C.mean(), 1),
        rh=round(g.Relative_Humidity_Percentage.mean()),
        top_crops=g.Recommended_Crop.value_counts().head(4).index.tolist(),
        records=int(len(g)),
    )
    out[name]["rain_annual"] = sum(out[name]["rain_monthly"])
json.dump(out, open("scripts/districts.json", "w"), indent=1)
for k, v in out.items(): print(k, v["zone"], v["soil"], v["ph"], v["rain_annual"], v["temp"])
