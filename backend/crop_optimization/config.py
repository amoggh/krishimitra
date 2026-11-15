"""
config.py — Central configuration for the Crop Optimization module.

All constants, paths, and tunable parameters live here.
Never scatter magic numbers across the codebase.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# Root of the crop_optimization package
MODULE_ROOT = Path(__file__).parent

# Real data directory containing the 5 agricultural datasets
DATA_DIR = MODULE_ROOT.parent / "data"

# Real dataset filenames present in backend/data/
HISTORICAL_YIELD_CSV = "crop_yield 1997 to 2020.csv"
ICRISAT_YIELD_CSV = "ICRISAT-District Level Data - yield.csv"
KARNATAKA_2021_CSV = "karnataka_crop_production_2021_22_yield.csv"
MANDI_PRICES_CSV = "mandi prices data.csv"
MULTI_MODEL_CSV = "karnataka_production_multi_model_dataset_soil_and_mandi.csv"

# Optional cultivation costs dataset (when available in future)
INPUT_COSTS_CSV = "input_costs.csv"
# Per-crop cultivation costs (Rs/ha) from DES Cost of Cultivation 2021-22,
# built by crop_optimization/data_pipeline/cultivation_costs.py
CULTIVATION_COSTS_CSV = "cultivation_costs_2021_22.csv"
# Daily Agmarknet price history (data_pipeline/live_mandi.py)
MANDI_HISTORY_DB = "mandi_history.sqlite"
# Alert when the mandi price falls below this fraction of the expected harvest price
PRICE_DROP_ALERT_FRACTION = 0.80
# Minimum distinct price days before history replaces the static CSV snapshot
MIN_MANDI_HISTORY_DAYS = 7
# IMD gridded rainfall: district × season table (data_pipeline/imd_rainfall.py)
IMD_RAINFALL_CSV = "imd_rainfall_district_season.csv"
# District groundwater stress (data_pipeline/cgwb_groundwater.py, GWRA 2023)
CGWB_GROUNDWATER_CSV = "cgwb_groundwater_district_2023.csv"
# Precautionary derating of borewell output where groundwater is over-drawn:
# falling water tables reduce yield and raise the risk of borewell failure.
GROUNDWATER_PUMP_DERATE = {
    "over_exploited": 0.80,
    "critical": 0.90,
}

# Trained model artifacts
ARTIFACTS_DIR = MODULE_ROOT.parent / "artifacts"
YIELD_MODEL_DIR = ARTIFACTS_DIR / "yield_model"
PRICE_MODEL_DIR = ARTIFACTS_DIR / "price_model"

# ---------------------------------------------------------------------------
# Supported geography (Phase 1 — Karnataka only)
# ---------------------------------------------------------------------------

SUPPORTED_STATES = ["Karnataka"]

# These are example districts for Phase 1.
# The actual list is driven by what exists in the data files.
# Do NOT treat this list as a hard rejection filter —
# it is used only for documentation/logging.
EXAMPLE_KARNATAKA_DISTRICTS = [
    "Mysuru",
    "Belagavi",
    "Dharwad",
    "Hassan",
    "Tumkuru",
    "Kalaburagi",
    "Shivamogga",
    "Bengaluru Rural",
]

# ---------------------------------------------------------------------------
# Supported seasons
# ---------------------------------------------------------------------------

SUPPORTED_SEASONS = ["kharif", "rabi", "zaid", "summer"]

# ---------------------------------------------------------------------------
# Motor HP — valid values only
# ---------------------------------------------------------------------------

VALID_MOTOR_HP = [1, 2, 3, 5, 7.5, 10]

# ---------------------------------------------------------------------------
# Pump flow rate lookup (litres/hour per HP) — engineering approximation.
#
# Real pump output depends on pump type, head, efficiency, and borewell
# conditions. This table is a reasonable starting approximation for
# typical agricultural centrifugal pumps at moderate heads.
#
# The tuple is (low_estimate, high_estimate) in litres/hour per HP.
# The midpoint is used as the base estimate; the range captures uncertainty.
# ---------------------------------------------------------------------------

PUMP_FLOW_RATE_LPH_PER_HP: dict[float, tuple[float, float]] = {
    1.0:  (500,  800),
    2.0:  (1000, 1600),
    3.0:  (1500, 2400),
    5.0:  (2500, 4000),
    7.5:  (3750, 6000),
    10.0: (5000, 8000),
}

# If borewell depth > this threshold (feet), apply an additional head penalty
# to the pump flow estimate.
BOREWELL_DEPTH_HIGH_THRESHOLD_FT = 300

# Head penalty factor for deep borewells (multiplied to flow estimate)
DEEP_BOREWELL_FLOW_PENALTY = 0.85

# ---------------------------------------------------------------------------
# Irrigation efficiency ranges  (fraction: 0–1)
# Expressed as (low, mid, high) — mid is used as the default estimate.
# ---------------------------------------------------------------------------

IRRIGATION_EFFICIENCY: dict[str, tuple[float, float, float]] = {
    "flood":     (0.45, 0.55, 0.60),
    "furrow":    (0.50, 0.55, 0.65),
    "sprinkler": (0.75, 0.80, 0.85),
    "drip":      (0.90, 0.92, 0.95),
}

# ---------------------------------------------------------------------------
# Effective rainfall fraction
#
# Not all rainfall becomes usable crop water. This fraction accounts for
# runoff, deep percolation, and non-uniform distribution.
# A more rigorous approach would use FAO-56 effective rainfall tables.
# ---------------------------------------------------------------------------

EFFECTIVE_RAINFALL_FRACTION = 0.70

# ---------------------------------------------------------------------------
# Crop allocation constraints
# ---------------------------------------------------------------------------

# No single crop should normally exceed this fraction of total land (default 60%)
MAX_SINGLE_CROP_FRACTION = 0.60

# Minimum area in acres worth allocating to a crop (below this is impractical)
MIN_CROP_AREA_ACRES = 0.25

# If water can support less than this fraction of the farm, no crop plan is offered
MIN_IRRIGABLE_FRACTION = 0.10

# Plans are sized on median rainfall; warn when a dry (IMD P25) year would leave
# more than this fraction of the plan's water need unmet, and scale confidence down
DRY_YEAR_SHORTFALL_WARN = 0.05
DRY_YEAR_CONFIDENCE_PENALTY = 0.90

# ---------------------------------------------------------------------------
# Optimizer settings (NSGA-II via numpy)
# ---------------------------------------------------------------------------

NSGA2_POPULATION_SIZE = 30
NSGA2_N_GENERATIONS = 20
NSGA2_SEED = 42


# ---------------------------------------------------------------------------
# Monte Carlo settings
# ---------------------------------------------------------------------------

MONTE_CARLO_N_SIMULATIONS = 1000
MONTE_CARLO_SEED = 42

# Yield failure threshold: probability that yield drops below this fraction
# of expected yield is reported as yield_failure_probability.
YIELD_FAILURE_THRESHOLD_FRACTION = 0.60

# Price crash threshold: probability that price drops below this fraction
# of expected price is reported as price_crash_probability.
PRICE_CRASH_THRESHOLD_FRACTION = 0.70

# ---------------------------------------------------------------------------
# Confidence / data-quality thresholds
# ---------------------------------------------------------------------------

# Minimum number of historical records required to consider a
# crop-district combination "data-rich" (affects confidence score).
MIN_RECORDS_HIGH_CONFIDENCE = 20
MIN_RECORDS_MEDIUM_CONFIDENCE = 5

# Maximum age of mandi price data (days) before it is considered stale
MANDI_DATA_STALE_DAYS = 180

# Mandi data older than this (days) is "aging" and gets a mild penalty
MANDI_DATA_AGING_DAYS = 30

# Confidence score cut-offs (score is 0–1, see confidence/calibration.py)
CONFIDENCE_HIGH_THRESHOLD = 0.65
CONFIDENCE_MEDIUM_THRESHOLD = 0.40

# ---------------------------------------------------------------------------
# Unit conversion constants
# ---------------------------------------------------------------------------

ACRES_PER_HECTARE = 2.47105
LITRES_PER_CUBIC_METRE = 1000.0
MM_PER_METRE = 1000.0
KG_PER_TONNE = 1000.0
KG_PER_QUINTAL = 100.0
