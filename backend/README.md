# KrushiMitra API (FastAPI)

REST backend for the mobile app. Currently serves structured mock responses; plug in ML pipeline services as they are built.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs: http://localhost:8000/docs

## Structure

```
app/
  main.py           # FastAPI app + CORS
  config.py         # Settings
  api/v1/           # Route modules
  models/schemas.py # Pydantic models
  services/         # Business logic & ML integration
```

Replace `services/mock_engine.py` with real pipeline calls (water budget, XGBoost yield, GBT price, Monte Carlo risk, NSGA-II optimizer) per master prompt.
