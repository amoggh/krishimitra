"""
Disease detection service.

Loads the MobileNetV2 model ONCE at import time (i.e. when the FastAPI
application starts) and exposes a single predict() function that reuses
the exact same preprocessing logic as test_disease_model.py.

Nothing here knows about HTTP – it is pure ML / IO logic.
"""

from __future__ import annotations

import io
import json
import logging
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths  (resolved relative to this file so the service works from any cwd)
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
_PROJECT_ROOT = _BACKEND_DIR.parent                           # KrushiMitra/
_ARTIFACTS_DIR = _PROJECT_ROOT / "artifacts" / "disease_detection"

_MODEL_PATH = _ARTIFACTS_DIR / "disease_classifier.keras"
_LABEL_MAP_PATH = _ARTIFACTS_DIR / "label_map.json"
_CONFIG_PATH = _ARTIFACTS_DIR / "inference_config.json"

# ---------------------------------------------------------------------------
# Load inference config
# ---------------------------------------------------------------------------
with open(_CONFIG_PATH, "r") as _f:
    _cfg = json.load(_f)

CONFIDENCE_THRESHOLD: float = float(_cfg["confidence_threshold"])   # 0.55
IMAGE_SIZE: tuple[int, int] = tuple(_cfg["image_size"])              # (224, 224)
SUPPORTED_EXTENSIONS: frozenset[str] = frozenset(_cfg["supported_extensions"])

MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB – sensible hard cap

# ---------------------------------------------------------------------------
# Load label map
# ---------------------------------------------------------------------------
with open(_LABEL_MAP_PATH, "r") as _f:
    # list index == class_id, so we can use direct indexing
    _label_map: list[dict] = json.load(_f)

_model = None


def _get_model():
    global _model
    if _model is None:
        logger.info("Loading disease detection model from %s …", _MODEL_PATH)
        import tensorflow as tf
        _model = tf.keras.models.load_model(str(_MODEL_PATH))
        logger.info(
            "Disease model loaded. input=%s  output=%s  classes=%d",
            _model.input_shape,
            _model.output_shape,
            len(_label_map),
        )
    return _model

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class DiseaseServiceError(ValueError):
    """Raised for invalid/corrupt input images."""


def validate_leaf_presence(img: Image.Image) -> tuple[bool, str, dict]:
    """
    Biological Foliage Gatekeeper (Layer 1).

    Analyzes image using:
      1. Excess Green Index (ExG = 2G - R - B)
      2. HSV Plant Foliage Mask (Healthy chlorophyll green, chlorotic yellow, necrotic foliar brown)
      3. Skin tone / human face exclusion mask
      4. Texture variance (distinguishes natural leaf venation from flat artificial green cards)

    Returns:
      (is_leaf: bool, failure_reason: str, metrics: dict)
    """
    thumb = img.convert("RGB").resize((160, 160))
    rgb_arr = np.array(thumb, dtype=np.float32)

    r = rgb_arr[:, :, 0]
    g = rgb_arr[:, :, 1]
    b = rgb_arr[:, :, 2]
    total_pixels = 160.0 * 160.0

    # 1. Excess Green Index (ExG)
    exg = 2.0 * g - r - b

    # 2. HSV Color Space Analysis
    # Pillow HSV: H in [0, 255] (corresponds to 0-360 deg: 1 deg ~ 0.708)
    hsv_arr = np.array(thumb.convert("HSV"), dtype=np.float32)
    h = hsv_arr[:, :, 0]
    s = hsv_arr[:, :, 1]
    v = hsv_arr[:, :, 2]

    # (A) Green plant foliage (Hue ~ 35 deg to 165 deg -> PIL H in [24, 125])
    green_mask = (
        (h >= 24) & (h <= 125) &
        (s >= 32) & (v >= 28) &
        (g > b + 4) & (exg > 4)
    )

    # (B) Chlorotic / Yellowing foliage (Hue ~ 24 deg to 38 deg -> PIL H in [17, 27])
    yellow_chlorosis_mask = (
        (h >= 17) & (h <= 27) &
        (s >= 40) & (v >= 45) &
        (g > b + 12) & (r > b + 12)
    )

    # (C) Necrotic / Blighted leaf lesions (brown/dark patches accompanied by plant tissue)
    necrotic_lesion_mask = (
        (h >= 8) & (h <= 22) &
        (s >= 28) & (s <= 185) &
        (v >= 28) & (v <= 185) &
        (r > b + 12) & (g > b + 4)
    )

    green_ratio = float(np.sum(green_mask)) / total_pixels
    yellow_ratio = float(np.sum(yellow_chlorosis_mask)) / total_pixels
    necrotic_ratio = float(np.sum(necrotic_lesion_mask)) / total_pixels

    foliage_ratio = green_ratio + yellow_ratio + (necrotic_ratio * 0.5)

    # 3. Human Skin Tone Check (HSV: H in [0, 18], S in [35, 175], V in [65, 245], R > G > B)
    skin_mask = (
        ((h <= 18) | (h >= 240)) &
        (s >= 35) & (s <= 175) &
        (v >= 65) &
        (r > g + 10) & (g > b)
    )
    skin_ratio = float(np.sum(skin_mask)) / total_pixels

    # 4. Texture / Edge Variance (Grayscale standard deviation)
    gray = np.dot(rgb_arr[..., :3], [0.2989, 0.5870, 0.1140])
    texture_std = float(np.std(gray))

    metrics = {
        "foliage_ratio": round(foliage_ratio, 4),
        "green_ratio": round(green_ratio, 4),
        "yellow_ratio": round(yellow_ratio, 4),
        "skin_ratio": round(skin_ratio, 4),
        "texture_std": round(texture_std, 2),
    }

    # Rejection Rule 1: High human skin coverage with negligible green
    if skin_ratio > 0.22 and green_ratio < 0.08:
        return False, "Image appears to contain a person or face, not a plant leaf.", metrics

    # Rejection Rule 2: Insufficient plant foliage (Less than 8.5% plant matter)
    if foliage_ratio < 0.085:
        return False, "No vegetative plant or leaf tissue detected in image.", metrics

    # Rejection Rule 3: Completely flat uniform color (e.g. green wallpaper or uniform card)
    if texture_std < 5.5 and foliage_ratio < 0.85:
        return False, "Image lacks natural organic leaf texture and venation.", metrics

    return True, "Valid leaf image", metrics


# ---------------------------------------------------------------------------
# Treatment & Advisory Database (Farmer-friendly ICAR/UAS approved practices)
# ---------------------------------------------------------------------------
TREATMENT_DATABASE: dict[str, dict[str, str]] = {
    "Early Blight": {
        "chemical": "Mancozeb 75% WP @ 2.5 g/L of water (35 g per 15L spray tank) or Chlorothalonil 75% WP @ 2 g/L.",
        "organic": "Neem seed kernel extract (NSKE 5%) or Copper oxychloride 50% WP @ 3 g/L.",
        "spray_dosage": "35–40 g per 15-liter backpack sprayer. Spray both upper and lower leaf surfaces.",
        "management": "Prune and destroy infected lower leaves. Avoid overhead sprinkler irrigation to reduce foliar moisture.",
    },
    "Late Blight": {
        "chemical": "Metalaxyl 8% + Mancozeb 64% WP (Ridomil MZ) @ 2.5 g/L of water, or Cymoxanil 8% + Mancozeb 64% @ 2 g/L.",
        "organic": "Bordeaux mixture (1%) or Trichoderma viride foliar spray (5 g/L).",
        "spray_dosage": "35–40 g per 15-liter backpack sprayer. Spray immediately during cool, humid morning hours.",
        "management": "Remove severely blighted foliage immediately. Ensure proper row spacing for sunlight penetration.",
    },
    "Bacterial Spot": {
        "chemical": "Copper Oxychloride 50% WP (30 g) + Streptocycline (1 g) mixed in 15 liters of water.",
        "organic": "Pseudomonas fluorescens biological foliar spray @ 5 g/L.",
        "spray_dosage": "2 grams Copper Oxychloride per 1 liter of clean water.",
        "management": "Avoid working in fields when foliage is wet. Disinfect cutting shears between rows.",
    },
    "Powdery Mildew": {
        "chemical": "Hexaconazole 5% EC @ 1 ml/L (15 ml per pump) or Wettable Sulphur 80% WP @ 2.5 g/L.",
        "organic": "Potassium bicarbonate spray (3 g/L) or cold-pressed Neem oil (3 ml/L + few drops liquid soap).",
        "spray_dosage": "15 ml Hexaconazole per 15-liter backpack sprayer.",
        "management": "Improve crop canopy ventilation and prune dense overlapping foliage.",
    },
    "Common Rust": {
        "chemical": "Propiconazole 25% EC (Tilt) @ 1 ml/L or Mancozeb 75% WP @ 2.5 g/L.",
        "organic": "Bio-fungicide Trichoderma harzianum @ 5 g/L.",
        "spray_dosage": "15 ml Propiconazole per 15L sprayer tank.",
        "management": "Practice 2-year crop rotation with non-host legumes; plant rust-resistant hybrids.",
    },
    "Northern Leaf Blight": {
        "chemical": "Azoxystrobin 18.2% + Difenoconazole 11.4% SC (Amistar Top) @ 1 ml/L.",
        "organic": "Neem oil foliar spray (3 ml/L) as protective shield.",
        "spray_dosage": "15 ml per 15L backpack spray tank.",
        "management": "Plow under crop residue after harvest to eliminate fungal spores in soil.",
    },
    "Black Rot": {
        "chemical": "Difenoconazole 25% EC @ 0.5 ml/L (7.5 ml per pump) or Captan 50% WP @ 2.5 g/L.",
        "organic": "Copper Hydroxide 77% WP @ 2 g/L.",
        "spray_dosage": "2.5 grams Captan per 1 liter water.",
        "management": "Prune out dead mummified fruit and infected vines before monsoon rains.",
    },
    "Apple Scab": {
        "chemical": "Difenoconazole 25% EC @ 0.5 ml/L or Myclobutanil 10% WP @ 0.5 g/L.",
        "organic": "Lime sulphur (1%) applied during early green tip stage.",
        "spray_dosage": "7.5 ml Difenoconazole per 15L spray tank.",
        "management": "Clear and compost or burn fallen leaves under tree canopy in autumn.",
    },
    "Cedar Apple Rust": {
        "chemical": "Myclobutanil 10% WP @ 0.5 g/L or Mancozeb 75% WP @ 2.5 g/L.",
        "organic": "Sulfur-based protective spray @ 2 g/L.",
        "spray_dosage": "35 g Mancozeb per 15L sprayer tank.",
        "management": "Remove nearby cedar or juniper trees within 500 meters if possible.",
    },
    "Leaf Mold": {
        "chemical": "Chlorothalonil 75% WP @ 2 g/L or Azoxystrobin 23% SC @ 1 ml/L.",
        "organic": "Copper soap fungicide spray @ 2.5 ml/L.",
        "spray_dosage": "30 g Chlorothalonil per 15-liter pump.",
        "management": "Increase greenhouse/tunnel ventilation and lower relative humidity below 85%.",
    },
    "Septoria Leaf Spot": {
        "chemical": "Mancozeb 75% WP @ 2.5 g/L or Copper Oxychloride @ 3 g/L.",
        "organic": "Bio-formulation of Bacillus subtilis @ 5 g/L.",
        "spray_dosage": "35 g Mancozeb per 15-liter backpack sprayer.",
        "management": "Mulch the soil base around plants to prevent rainwater splash from carrying spores.",
    },
    "Spider Mites": {
        "chemical": "Propargite 57% EC @ 2 ml/L (30 ml per pump) or Spiromesifen 22.9% SC @ 1 ml/L.",
        "organic": "Cold-pressed Neem oil (5 ml/L) or wettable sulfur (3 g/L).",
        "spray_dosage": "Ensure thorough spraying on the underside of leaves where mites colonize.",
        "management": "Wash foliage with high-pressure water spray to disrupt web colonies.",
    },
    "Target Spot": {
        "chemical": "Pyraclostrobin 20% WG @ 1 g/L or Chlorothalonil @ 2 g/L.",
        "organic": "Copper-based protective spray @ 2.5 g/L.",
        "spray_dosage": "15 g Pyraclostrobin per 15L spray tank.",
        "management": "Avoid excess nitrogen fertilizer which causes soft, susceptible leafy growth.",
    },
    "Yellow Leaf Curl Virus": {
        "chemical": "Control whitefly vectors: Thiamethoxam 25% WG @ 0.3 g/L (5 g per 15L pump) or Acetamiprid 20% SP @ 0.5 g/L.",
        "organic": "Install yellow sticky traps (15–20 per acre) and spray 5% Neem seed kernel extract (NSKE).",
        "spray_dosage": "Spray during early morning when whiteflies are sluggish.",
        "management": "Rogue out (uproot and bury) severely infected stunted plants immediately.",
    },
    "Mosaic Virus": {
        "chemical": "No direct chemical cure for viral infection. Control aphid vectors with Imidacloprid 17.8% SL @ 0.5 ml/L.",
        "organic": "Foliar spray with skimmed milk (10% solution) to neutralize contact transmission; spray Neem oil.",
        "spray_dosage": "7.5 ml Imidacloprid per 15L spray tank for aphid vector management.",
        "management": "Sterilize tools with 10% trisodium phosphate (TSP) or soap water. Do not smoke/handle tobacco near crops.",
    },
}


def get_treatment_advisory(crop: str, condition: str, is_healthy: bool) -> dict:
    """Return tailored, farmer-friendly treatment guidance for diagnosed crop condition."""
    if is_healthy:
        return {
            "status": "healthy",
            "message": "Foliage is healthy and active. Continue balanced NPK nutrition and weekly crop scouting.",
            "chemical": "No chemical fungicide required.",
            "organic": "Preventive Panchagavya (3%) or Neem oil (2 ml/L) foliar wash every 15 days.",
            "spray_dosage": "Maintain soil moisture without waterlogging.",
            "management": "Keep field free of weeds and ensure proper plant spacing.",
        }

    cond_lower = condition.lower()
    for key, data in TREATMENT_DATABASE.items():
        if key.lower() in cond_lower or any(word in cond_lower for word in key.lower().split()):
            return data

    return {
        "chemical": "Broad-spectrum contact fungicide: Mancozeb 75% WP @ 2.5 g/L of water (35 g per 15L tank).",
        "organic": "Neem oil 3 ml/L + Copper Oxychloride 50% WP @ 2.5 g/L.",
        "spray_dosage": "Spray 15–20 liters per 1,000 sq. meters, wetting upper and lower leaf surfaces.",
        "management": "Prune and destroy infected leaves. Consult local Krishi Vigyan Kendra (KVK) agronomist.",
    }


def predict(image_bytes: bytes) -> dict:
    """
    Run the biological foliage gatekeeper and MobileNetV2 plant-disease classifier on raw image bytes.

    Parameters
    ----------
    image_bytes : bytes
        Raw bytes of the uploaded image file.

    Returns
    -------
    dict with keys:
        success        bool
        prediction     dict (see below) or None on error
        error_type     str | None
        message        str | None
    """
    # ---- 1. Validate size ------------------------------------------------
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise DiseaseServiceError(
            f"File too large ({len(image_bytes) // 1024} KB). "
            f"Maximum allowed is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )

    # ---- 2. Decode image --------------------------------------------------
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()          # catches obviously corrupt files early
        img = Image.open(io.BytesIO(image_bytes))  # reopen after verify()
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, Exception) as exc:
        raise DiseaseServiceError(f"Cannot decode image: {exc}") from exc

    # ---- 2.1 Layer 1: Biological Foliage Gatekeeper -----------------------
    is_leaf, failure_reason, metrics = validate_leaf_presence(img)
    if not is_leaf:
        logger.info("Biological leaf gatekeeper rejected upload: %s (metrics: %s)", failure_reason, metrics)
        return {
            "success": False,
            "error_type": "invalid_image",
            "message": "No crop leaf detected. Please upload a clear photo of a plant leaf.",
            "details": failure_reason,
            "metrics": metrics,
        }

    # ---- 3. Preprocess  (identical to test_disease_model.py) --------------
    img = img.convert("RGB")
    img = img.resize(IMAGE_SIZE)                          # (224, 224)

    img_array = np.array(img, dtype=np.float32)           # HxWx3
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    img_array = preprocess_input(img_array)               # MobileNetV2 normalisation
    img_array = np.expand_dims(img_array, axis=0)         # 1xHxWx3

    # ---- 4. Inference -----------------------------------------------------
    model = _get_model()
    predictions = model.predict(img_array, verbose=0)
    probs = predictions[0]

    # Sort descending by probability
    sorted_indices = np.argsort(probs)[::-1]
    top1_idx = int(sorted_indices[0])
    top2_idx = int(sorted_indices[1])
    top3_idx = int(sorted_indices[2]) if len(sorted_indices) > 2 else top2_idx

    top1_prob = float(probs[top1_idx])
    top2_prob = float(probs[top2_idx])
    top3_prob = float(probs[top3_idx])
    margin = float(top1_prob - top2_prob)

    # Shannon Entropy for Out-of-Distribution (OOD) & Uncertainty Evaluation
    safe_probs = np.clip(probs, 1e-7, 1.0)
    entropy = float(-np.sum(safe_probs * np.log(safe_probs)))
    norm_entropy = float(entropy / np.log(len(probs)))  # Normalized 0.0 (sharp) to 1.0 (uniform)

    candidates = [
        {
            "crop": _label_map[top1_idx]["crop"],
            "condition": _label_map[top1_idx]["condition"],
            "confidence": round(top1_prob, 4),
        },
        {
            "crop": _label_map[top2_idx]["crop"],
            "condition": _label_map[top2_idx]["condition"],
            "confidence": round(top2_prob, 4),
        },
    ]
    if top3_prob > 0.08:
        candidates.append({
            "crop": _label_map[top3_idx]["crop"],
            "condition": _label_map[top3_idx]["condition"],
            "confidence": round(top3_prob, 4),
        })

    # Out-of-Distribution (OOD) & Uncertainty Evaluation:
    # A prediction is marked confident if:
    # 1. Top-1 probability >= CONFIDENCE_THRESHOLD (0.55)
    # 2. Normalized entropy < 0.58 (prediction distribution is sharp, not uniformly confused)
    # 3. Top-1 vs Top-2 margin >= 0.12 (clear winner, not a split decision between two crops)
    is_confident = (
        top1_prob >= CONFIDENCE_THRESHOLD and
        norm_entropy < 0.58 and
        margin >= 0.12
    )

    # ---- 5. Map to label or OOD Guidance -----------------------------------
    if not is_confident:
        return {
            "success": True,
            "prediction": {
                "crop": None,
                "condition": "Uncertain",
                "class_name": None,
                "is_healthy": None,
                "confidence": round(top1_prob, 4),
                "status": "uncertain",
                "entropy": round(norm_entropy, 3),
                "margin": round(margin, 3),
                "candidates": candidates,
                "shooting_guidance": [
                    "Hold your camera 10–15 cm from the affected leaf spot for a clear macro shot.",
                    "Ensure bright daylight and avoid heavy shadows, direct sun glare, or camera blur.",
                    "Place your palm or a plain neutral sheet behind the leaf to block background soil and weeds.",
                    "If scanning a local field crop (such as Ragi, Sugarcane, or Cotton), ask the Krishi AI Assistant.",
                ],
            },
        }

    label = _label_map[top1_idx]
    treatment = get_treatment_advisory(label["crop"], label["condition"], label["is_healthy"])

    return {
        "success": True,
        "prediction": {
            "crop": label["crop"],
            "condition": label["condition"],
            "class_name": label["class_name"],
            "is_healthy": label["is_healthy"],
            "confidence": round(top1_prob, 4),
            "status": "confident",
            "entropy": round(norm_entropy, 3),
            "margin": round(margin, 3),
            "candidates": candidates,
            "treatment": treatment,
        },
    }
