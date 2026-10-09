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


def predict(image_bytes: bytes) -> dict:
    """
    Run the MobileNetV2 plant-disease classifier on raw image bytes.

    Parameters
    ----------
    image_bytes : bytes
        Raw bytes of the uploaded image file.

    Returns
    -------
    dict with keys:
        success        bool
        prediction     dict (see below) or None on error
        error          str | None

    prediction dict:
        crop           str | None
        condition      str
        class_name     str | None
        is_healthy     bool | None
        confidence     float
        status         "confident" | "uncertain"
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
    except (UnidentifiedImageError, Exception) as exc:
        raise DiseaseServiceError(f"Cannot decode image: {exc}") from exc

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

    predicted_index = int(np.argmax(predictions[0]))
    confidence = float(predictions[0][predicted_index])

    # ---- 5. Map to label --------------------------------------------------
    if confidence < CONFIDENCE_THRESHOLD:
        return {
            "success": True,
            "prediction": {
                "crop": None,
                "condition": "Uncertain",
                "class_name": None,
                "is_healthy": None,
                "confidence": round(confidence, 4),
                "status": "uncertain",
            },
        }

    label = _label_map[predicted_index]

    return {
        "success": True,
        "prediction": {
            "crop": label["crop"],
            "condition": label["condition"],
            "class_name": label["class_name"],
            "is_healthy": label["is_healthy"],
            "confidence": round(confidence, 4),
            "status": "confident",
        },
    }
