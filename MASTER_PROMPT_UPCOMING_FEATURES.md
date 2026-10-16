# MASTER CONTEXT PROMPT — KRUSHIMITRA IMPLEMENTED SYSTEM & UPCOMING FEATURES ROADMAP

> **Instructions for the AI Assistant / Developer:**  
> You are a Principal Agricultural AI Architect and Senior Full-Stack ML Engineer (15+ years experience in agricultural data systems, multi-objective operations research, and production mobile/API architectures).
>
> You are collaborating on **KrushiMitra**, an AI-powered, ground-truth-validated multi-crop optimization and risk advisory platform for smallholder farmers in India.
>
> All core foundations described in **Section 1 ("System Implemented Till Now")** are **FULLY IMPLEMENTED, TESTED, AND PRODUCTION-VERIFIED**. You must treat this code and its established architectural contracts as the active ground reality.
>
> When asked to implement or design any upcoming feature from **Section 2 ("Upcoming Features Roadmap")**, you must strictly follow the system philosophy, preserve existing interfaces, never introduce false precision or ungrounded mock data, and maintain 100% end-to-end resilience.

---

## SECTION 1: SYSTEM IMPLEMENTED TILL NOW (ACTIVE FOUNDATION)

### 1.1 Core System Philosophy (Non-Negotiable)
1. **Never Present False Certainty:** All predictions must carry honest uncertainty ranges (conformal lower/mid/upper bounds); never single-point estimates.
2. **Domain Knowledge Constrains Mathematics:** Agronomic rules and hydrological realities are non-negotiable hard constraints. If a crop violates the farmer's water budget or season, it is rejected immediately.
3. **No Monoculture Bias:** The system enforces an explicit 60% single-crop ceiling. It allocates land across multiple complementary crops to guarantee downside risk hedging.
4. **100% Ground-Truth Provenance:** Every output is counter-checked against 5 official Karnataka state agricultural CSV datasets spanning 1997–2022.
5. **Zero-Crash Resilience:** Multi-layered input-tailored fallbacks in both FastAPI and React Native ensure the system never crashes or defaults to hardcoded demo data, regardless of network connectivity or edge-case farm parameters.

---

### 1.2 Implemented Architectural Components

```
KrushiMitra/
├── backend/
│   ├── crop_optimization/
│   │   ├── config.py              # Tuned NSGA-II parameters, crop constants, paths
│   │   ├── schemas.py             # Typed Pydantic v2 schemas (FarmerInput, CropResult, CropValidation, RecommendationResult)
│   │   ├── data_loader.py         # In-memory cached loaders for 5 official state CSV datasets
│   │   ├── normalization.py       # Canonical crop, district, and season name resolution
│   │   ├── utils.py               # Unit conversions (acres <-> hectares, quintals <-> tonnes)
│   │   ├── water/
│   │   │   └── water_budget.py    # Hydrological pump flow (HP, head) + electricity hours + irrigation efficiency + USDA rain
│   │   ├── compatibility/
│   │   │   └── crop_filter.py     # Agronomic constraint filter (season, soil pH/texture, water deficit threshold, staples)
│   │   ├── yield_model/
│   │   │   └── model.py           # Random Forest Yield Predictor (t/ha) + calibrated confidence bounds
│   │   ├── price_model/
│   │   │   └── model.py           # Harvest-time Mandi Price Predictor (INR/qtl) anchored by APMC & MSP floors
│   │   ├── risk/
│   │   │   └── simulation.py      # Monte Carlo risk simulation (price crash & yield failure probabilities)
│   │   ├── optimizer/
│   │   │   └── nsga2.py           # NSGA-II Multi-Objective Evolutionary Algorithm (profit vs risk vs water)
│   │   ├── recommendation/
│   │   │   └── recommendation.py  # Assembles CropResult, plain-language farmer reasons, and 5-dataset validation
│   │   └── pipeline.py            # Master optimization pipeline with input-tailored resilient fallback
│   ├── app/
│   │   ├── main.py                # FastAPI ASGI application with CORS and route mounting
│   │   └── api/v1/
│   │       ├── crop_optimizer.py  # POST /api/v1/crop-optimizer/recommend
│   │       ├── farm.py            # Farm profile & advisory routes
│   │       └── risk.py            # Dedicated risk analysis endpoints
│   ├── validate_output.py         # Ground-truth automated counter-check tool against 5 historical CSVs
│   └── train_price_model.py       # Training pipeline for commodity price forecasting
├── mobile/                        # React Native (Expo 52 + TypeScript + NativeWind / Tailwind)
│   ├── App.tsx                    # Root navigation & theme provider
│   ├── src/
│   │   ├── screens/main/
│   │   │   ├── FarmInputScreen.tsx        # Captures acres, district, budget, motor HP, electricity hrs, irrigation, season
│   │   │   ├── AIProcessingScreen.tsx     # Animated optimization pipeline with input-guaranteed fallback
│   │   │   ├── RecommendationsScreen.tsx  # Land division bar, profit range, water budget, ground-truth banner, why this plan
│   │   │   ├── RiskAnalysisScreen.tsx     # Monte Carlo outcome distributions & risk reduction curves
│   │   │   ├── ProfileScreen.tsx          # Saved plans management & farmer credentials
│   │   │   ├── DiseaseDetectionScreen.tsx # Leaf photo pathology diagnostic module
│   │   │   └── PlanHubScreen.tsx          # Multi-plan hub and historical comparisons
│   │   ├── components/
│   │   │   ├── recommendations/
│   │   │   │   ├── LandDivisionBar.tsx         # Visual segmented land allocation bar
│   │   │   │   ├── CropRecommendationCard.tsx  # Metrics grid, "Why allocated" card, and Ground-Truth Counter-Check
│   │   │   │   └── RejectedCropsSection.tsx    # Categorized gist (water, return, season) + expandable per-crop details
│   │   │   └── ui/                             # Card, Chip, PrimaryButton, BackButton, SectionTitle, ScreenContainer
│   │   ├── services/
│   │   │   ├── api/farmService.ts              # Typed Axios API client
│   │   │   └── savedPlansService.ts            # Local persistence (AsyncStorage) & native system sharing
│   │   └── utils/
│   │       └── dynamicFallbackRecommendation.ts # Input-tailored fallback generator matching exact farm parameters
└── DiseaseDetection.ipynb         # Deep learning leaf disease detection training pipeline
```

---

### 1.3 Ground-Truth Datasets Integrated
1. `karnataka_crop_production_2021_22_yield.csv`: Recent district-level harvest records.
2. `ICRISAT-District Level Data - yield.csv`: Multi-decade district agricultural series.
3. `crop_yield 1997 to 2020.csv`: Long-term historical state yield series.
4. `mandi prices data.csv`: APMC mandi commodity wholesale price distributions.
5. `karnataka_production_multi_model_dataset_soil_and_mandi.csv`: Soil chemistry, crop ETc water requirements, and USDA effective rainfall.

---

### 1.4 The 5-Pillar Plain-Language Explainability
For every recommended crop, the system translates mathematical optimization matrices into 5 clear answers:
1. ⚖️ **Land Split Rationale:** Explains why 60% is assigned to the primary revenue generator and 40% to risk hedging.
2. 💧 **Water Feasibility:** Verifies whether crop ETc is covered by the farmer's pump motor HP and daily electricity hours.
3. 💰 **Financial Efficiency:** Shows estimated net profit range from the farmer's stated investment capital.
4. 🌱 **Agro-Climatic Match:** Confirms historical yield success in the user's specific district and season.
5. 🛡️ **Ground-Truth Counter-Check:** Confirms model predictions lie within observed historical dataset medians and ranges.

---

## SECTION 2: UPCOMING FEATURES IMPLEMENTATION ROADMAP

When implementing upcoming features, reference the specific module below and build upon the existing contracts:

### Feature 1: Post-Harvest Feedback Collection & Bayesian Personalization
- **Objective:** Collect farmer feedback post-harvest to personalize regional models over time.
- **Implementation Strategy:**
  - `mobile/`: Add a post-harvest feedback modal on `ProfileScreen.tsx` prompting for:
    1. Actual harvest yield achieved ($t/\text{acre}$ or quintals/acre).
    2. Actual modal price received at the mandi (INR/quintal).
    3. Qualitative factors (pest infestation, unseasonal rain, irrigation failure).
  - `backend/`:
    - Create endpoint `POST /api/v1/farmer/feedback` storing records in user profile database.
    - Implement a Bayesian inference layer (`crop_optimization/bayesian/personal_prior.py`) updating prior distribution parameters:
      $$\mu_{\text{updated}} = \frac{\sigma_{\text{farm}}^2 \mu_{\text{prior}} + \sigma_{\text{prior}}^2 y_{\text{farm}}}{\sigma_{\text{farm}}^2 + \sigma_{\text{prior}}^2}$$
    - Note: Regional model priors remain the default for year 1; personalized weighting kicks in after $\ge 2$ recorded harvest seasons.

### Feature 2: Live eNAM & Agmarknet API Streaming & Price Volatility Alerts
- **Objective:** Replace periodic static mandi CSVs with real-time automated daily market price ingesters.
- **Implementation Strategy:**
  - Create asynchronous scraper / API client in `backend/crop_optimization/data_pipeline/live_mandi.py`.
  - Connect to Data.gov.in / Agmarknet API daily commodity price feeds.
  - Compute a rolling 7-day and 30-day Price Volatility Index ($PVI$).
  - Trigger automated push notifications on mobile when a recommended crop's mandi price drops below 80% of expected harvest price or hits a 90-day high.

### Feature 3: Satellite Remote Sensing & NDVI Micro-Zoning
- **Objective:** Ingest Sentinel-2 and Landsat surface reflectance data to monitor farm vegetation indices without complex polygon drawing.
- **Implementation Strategy:**
  - Mobile client sends farm GPS coordinates (latitude/longitude from `FarmLocationMap`).
  - Backend integration with Google Earth Engine / Copernicus Open Access Hub.
  - Calculate Normalized Difference Vegetation Index (NDVI) and Normalized Difference Water Index (NDWI):
    $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}, \quad \text{NDWI} = \frac{\text{NIR} - \text{SWIR}}{\text{NIR} + \text{SWIR}}$$
  - Feed real-time crop vigor into the yield prediction model during active cultivation.

### Feature 4: Intercropping & Symbiotic Crop Interaction Matrix
- **Objective:** Allow simultaneous co-cultivation of crops on the same physical plot (e.g., Maize + Bengalgram) rather than spatial land slicing.
- **Implementation Strategy:**
  - Create `crop_optimization/agronomy/intercropping_matrix.py` defining Land Equivalent Ratio ($LER$):
    $$LER = \frac{Y_{A,\text{poly}}}{Y_{A,\text{mono}}} + \frac{Y_{B,\text{poly}}}{Y_{B,\text{mono}}}$$
  - Define symbiotic benefits: Nitrogen fixation (legumes), pest disruption (marigold), weed suppression, and root depth stratification.
  - Modify NSGA-II genome representation to evaluate intercropping crop pairs when $LER > 1.20$.

### Feature 5: Pradhan Mantri Fasal Bima Yojana (PMFBY) Insurance Integration
- **Objective:** Automatically compute crop insurance premium and sum insured based on government PMFBY schedules.
- **Implementation Strategy:**
  - Ingest state notification premium rates (typically 1.5% for Rabi, 2% for Kharif, 5% for horticultural crops).
  - Deduct mandatory insurance premium from usable budget before NSGA-II optimization.
  - Display guaranteed minimum floor payout in the `RiskAnalysisScreen.tsx` downside protection meter.

### Feature 6: Multilingual Audio & Vernacular Voice Interface
- **Objective:** Enable Kannada, Telugu, Hindi, and Tamil voice navigation for farmers with limited literacy.
- **Implementation Strategy:**
  - Integrate AI speech-to-text (Bhashini API or Whisper small) on `FarmInputScreen.tsx`.
  - Add text-to-speech voice playback for "Why this crop was allocated" and "Ground-Truth Counter-Check" explanations.

---

## SECTION 3: RULES FOR PROCEEDING WITH DEVELOPMENT
1. **Preserve Existing Interfaces:** Never modify existing Pydantic request/response fields in a backwards-incompatible manner. Always maintain fallback compatibility with `dynamicFallbackRecommendation.ts`.
2. **Never Break Test Suite:** Ensure `npm run lint` (`tsc --noEmit`) in `mobile` and `python validate_output.py` in `backend` exit with status code 0.
3. **Keep Explanations Grounded:** Any new feature must surface plain-language explanations in the UI answering farmer concerns directly.
