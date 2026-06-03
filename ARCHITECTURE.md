# KrushiMitra — System Architecture

Production layout for the AI crop optimization platform (mobile + API + ML modules).

## Repository layout

```
KrushiMitra/
├── mobile/                 # React Native (Expo) — farmer-facing app
├── backend/                # FastAPI — REST API for app & ML services
├── DiseaseDetection.ipynb  # Plant disease ML module (training)
└── ARCHITECTURE.md
```

## Mobile (`mobile/`)

| Layer | Tech | Role |
|-------|------|------|
| Framework | Expo 52 + React Native | Cross-platform iOS/Android |
| Styling | NativeWind 4 (Tailwind) | Design system, farmer-friendly UI |
| Navigation | React Navigation 7 | Auth stack + root stack + bottom tabs |
| HTTP | Axios | Typed API client with interceptors |
| Charts | react-native-chart-kit | Bar/line charts, Monte Carlo risk curve |
| Maps | react-native-maps | Farm location on home / input |

### Screen map

| Screen | File | Navigator |
|--------|------|-----------|
| Splash | `screens/auth/SplashScreen.tsx` | Auth stack |
| Login / OTP | `screens/auth/LoginScreen.tsx` | Auth stack |
| Home | `screens/main/HomeScreen.tsx` | Tab: Home |
| Plan hub | `screens/main/PlanHubScreen.tsx` | Tab: Plan |
| Farm input | `screens/main/FarmInputScreen.tsx` | Root stack |
| AI processing | `screens/main/AIProcessingScreen.tsx` | Root stack |
| Recommendations | `screens/main/RecommendationsScreen.tsx` | Root stack |
| Risk analysis | `screens/main/RiskAnalysisScreen.tsx` | Root stack |
| Market insights | `screens/main/MarketInsightsScreen.tsx` | Tab: Market |
| Profile | `screens/main/ProfileScreen.tsx` | Tab: Profile |
| Settings | `screens/main/SettingsScreen.tsx` | Root stack (modal) |

### Component modules

- `components/ui/` — Card, buttons, forms, headers
- `components/home/` — Weather, soil, water, quick actions
- `components/charts/` — MiniBarChart, PriceTrendChart, MonteCarloChart
- `components/maps/` — FarmLocationMap
- `components/recommendations/` — Land division, crop cards
- `components/risk/` — Risk meters

### API services (`src/services/api/`)

- `authService` — OTP request/verify
- `farmService` — Dashboard, analyze, recommendations
- `marketService` — Mandi prices
- `riskService` — Risk analysis per plan

Mock data in `src/data/mockData.ts` is used when the API is unreachable (development).

## Backend (`backend/`)

| Layer | Tech | Role |
|-------|------|------|
| API | FastAPI | REST `/api/v1/*` |
| Validation | Pydantic v2 | Request/response schemas |
| ML (future) | Python services | Yield, price, risk, optimization pipelines |

### Endpoints (v1)

- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`
- `GET  /api/v1/farm/dashboard`
- `POST /api/v1/farm/analyze`
- `GET  /api/v1/farm/recommendations/{job_id}`
- `GET  /api/v1/market/prices?district=`
- `GET  /api/v1/risk/{plan_id}`
- `GET  /health`

`app/services/mock_engine.py` returns sample data until ML pipeline is connected.

## Data flow (recommendation)

```
Farmer input (mobile)
  → POST /farm/analyze
  → [Water budget → Compatibility → Yield → Price → Risk → Optimizer]
  → GET /farm/recommendations/{job_id}
  → Recommendations + Risk screens (mobile)
```

## Run locally

See `mobile/README.md` and `backend/README.md`.
