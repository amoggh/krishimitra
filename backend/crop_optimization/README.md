# KrushiMitra — Crop Optimization Module

Recommends the best way for a farmer to divide their land among suitable crops,
given their location, land, budget, irrigation setup, and season.

**Phase 1 scope:** Karnataka, India.

---

## What It Does

Given farmer inputs (area, district, motor HP, irrigation type, season, etc.),
the system:

1. Estimates available seasonal water from pump output + effective rainfall.
2. Filters crops to those agronomically compatible (season, pH, water requirement).
3. Predicts yield and price per crop (once models are trained).
4. Runs Monte Carlo simulations to estimate profit distributions and risk.
5. Uses NSGA-II multi-objective optimization to allocate land across crops.
6. Returns a farmer-friendly recommendation with explanations.

If data or models are missing, the system clearly says what is unavailable
rather than fabricating results.

---

## Folder Structure

```
crop_optimization/
├── __init__.py
├── config.py            # All constants and paths (no magic numbers elsewhere)
├── schemas.py           # Pydantic input/output models
├── utils.py             # Shared utilities (unit conversions, safe parsing)
├── data_loader.py       # CSV loaders with normalisation and validation
│
├── data/
│   ├── README.md        # Dataset schemas and data sources
│   └── (CSV files here — initially empty)
│
├── water/
│   └── water_budget.py  # Pump flow + irrigation efficiency + rainfall
│
├── compatibility/
│   └── crop_filter.py   # Hard and soft agronomic compatibility checks
│
├── yield_model/
│   └── model.py         # XGBoost yield prediction interface (stub until trained)
│
├── price_model/
│   └── model.py         # GBT price prediction interface (stub until trained)
│
├── risk/
│   └── monte_carlo.py   # Monte Carlo profit/risk simulation
│
├── optimizer/
│   └── nsga2.py         # NSGA-II multi-objective land allocation
│
├── recommendation/
│   └── recommendation.py # Assembles final result with explanations
│
└── pipeline.py          # Orchestrates all steps
```

---

## Installation

```bash
pip install fastapi uvicorn pydantic pydantic-settings pandas numpy scipy
# For ML models (Phase 4+):
pip install xgboost scikit-learn joblib
# For optimizer (Phase 6+):
pip install pymoo
```

Or add to `requirements.txt` and run:
```bash
pip install -r requirements.txt
```

---

## How to Add Data

Place CSV files in `crop_optimization/data/`. The expected files are:

| File | Contents |
|------|----------|
| `crops.csv` | Master crop list with season and district |
| `crop_requirements.csv` | Agronomic requirements per crop/season |
| `soil.csv` | Soil characteristics by district |
| `weather.csv` | Historical monthly weather by district |
| `mandi_prices.csv` | Historical mandi prices (₹/quintal) |
| `input_costs.csv` | Cultivation costs by crop/district/tier |

See `crop_optimization/data/README.md` for full column schemas and data sources.

The code handles missing files gracefully — it reports which features are
unavailable rather than crashing or fabricating data.

---

## Dataset Schemas

See [`data/README.md`](data/README.md) for detailed schemas and recommended sources.

Key points:
- Prices in ₹/quintal
- Yield in tonnes/hectare
- Rainfall/water in mm
- Nutrients (N, P, K) in kg/ha

Unit conversion functions are in `utils.py`.

---

## How to Run Preprocessing

No dedicated preprocessing step yet. The loaders in `data_loader.py` normalise
columns automatically when data is loaded. If government datasets use different
column names, add a mapping in the relevant loader function.

---

## How to Train Models

**Yield model** (train once per year after harvest data is updated):
```bash
python train_yield_model.py
```

**Price model** (train monthly as new mandi data arrives):
```bash
python train_price_model.py
```

Both scripts currently contain TODO placeholders — implement the feature
engineering and training sections after real data is added.

Trained models are saved to `artifacts/yield_model/` and `artifacts/price_model/`.

---

## How to Run Tests

From the `backend/` directory:
```bash
pytest tests/ -v
```

All tests work offline — no internet, no CSV files, no trained models required.

Run a specific test file:
```bash
pytest tests/test_water_budget.py -v
pytest tests/test_crop_filter.py -v
pytest tests/test_risk.py -v
pytest tests/test_optimizer.py -v
pytest tests/test_pipeline.py -v
```

---

## How to Start the API

From the `backend/` directory:
```bash
uvicorn app.main:app --reload
```

The API docs are available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Example API Request

```http
POST /api/v1/crop-optimizer/recommend
Content-Type: application/json

{
  "area_acres": 5,
  "district": "Mysuru",
  "investment_inr": 150000,
  "motor_hp": 5,
  "daily_electricity_hours": 6,
  "irrigation_type": "drip",
  "borewell_depth_ft": 300,
  "season": "kharif",
  "soil": {
    "ph": 6.8,
    "nitrogen": 120,
    "phosphorus": 40,
    "potassium": 180,
    "texture": "loamy"
  }
}
```

---

## Example API Response (current state — data missing)

```json
{
  "location": "Mysuru, Karnataka",
  "season": "kharif",
  "total_land_acres": 5.0,
  "budget_inr": 150000,
  "water_budget": {
    "estimated_daily_litres_mid": 16560.0,
    "seasonal_pumped_mm_mid": 238.5,
    "effective_rainfall_mm": 0.0,
    "total_available_mm_mid": 238.5,
    "warnings": [
      "Weather data is unavailable. Rainfall contribution cannot be estimated.",
      "Borewell depth was not provided. ..."
    ]
  },
  "recommendations": [],
  "rejected_crops": [],
  "warnings": [
    "'crop_requirements.csv' is missing. ...",
    "'mandi_prices.csv' is missing. ..."
  ],
  "data_quality": {
    "soil_data_available": false,
    "weather_data_available": false,
    "mandi_data_available": false,
    "yield_model_trained": false,
    "price_model_trained": false
  },
  "status": "no_recommendation",
  "message": "No crops could be recommended given the current constraints..."
}
```

---

## Current Limitations

- The data directory is empty — no crop recommendations can be made yet.
- ML models (yield, price) are not trained.
- Monte Carlo simulation requires trained models.
- NSGA-II optimizer falls back to equal allocation until risk data is available.
- Only Karnataka is supported in Phase 1.
- No farmer-specific historical personalisation (Phase 2).

---

## Data Sources

| Data type | Recommended source |
|-----------|-------------------|
| Crop yield history | [ICRISAT District Level Database](https://data.icrisat.org/dld/) |
| Crop area/production | [desagri.gov.in](https://data.desagri.gov.in/website/crops-apy-report-web) |
| Mandi prices | [AGMARKNET](https://agmarknet.gov.in) |
| Weather | [IMD](https://mausam.imd.gov.in) |
| Soil | [NBSS&LUP](https://www.nbsslup.in) |
| Crop requirements | [ICAR publications](https://icar.org.in) |
| Karnataka specific | [Karnataka Open Data](https://karnataka.data.gov.in) |
| Groundwater context | [CGWB](https://cgwb.gov.in) |

---

## How to Add a New Crop

1. Add a row to `data/crops.csv` with the crop name, category, season, and district.
2. Add a row to `data/crop_requirements.csv` with the agronomic requirements.
3. Add cultivation cost data to `data/input_costs.csv`.
4. Add mandi price history to `data/mandi_prices.csv` if available.
5. Retrain the yield model (`python train_yield_model.py`).
6. Retrain the price model (`python train_price_model.py`).

No code changes are needed for new crops — the system reads from the data files.

---

## How to Add a New District

1. Add weather records for the district to `data/weather.csv`.
2. Add soil records for the district to `data/soil.csv`.
3. Add crop entries for the district to `data/crops.csv` and `data/crop_requirements.csv`.
4. Add cost data to `data/input_costs.csv`.
5. Add mandi price data for the district to `data/mandi_prices.csv`.
6. Retrain both models.

To add a new state (beyond Karnataka):
- Add the state name to `SUPPORTED_STATES` in `config.py`.
- Follow the same data steps above for the new state's districts.

---

## Next Development Steps

After collecting and placing real CSV data:

1. **Verify data loaders** — run `pytest tests/` to confirm no errors.
2. **Inspect loaded DataFrames** — check column names match expected schemas.
3. **Test water budget with real rainfall** — verify seasonal rainfall estimates.
4. **Test crop filter** — confirm compatible crops are identified correctly.
5. **Implement yield model training** — fill in the TODO in `train_yield_model.py`.
6. **Implement price model training** — fill in the TODO in `train_price_model.py`.
7. **Test end-to-end recommendation** — call the API and verify the full result.
