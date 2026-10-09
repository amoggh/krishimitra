"""
Disease detection routes.

POST /disease/predict   – primary endpoint (spec-compliant response)
POST /disease/analyze   – alias kept for backwards compatibility
GET  /disease/status    – health / readiness check
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services import disease_service
from app.services.disease_service import (
    SUPPORTED_EXTENSIONS,
    MAX_UPLOAD_BYTES,
    DiseaseServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/disease", tags=["disease"])

# Allowed MIME types that map to our supported extensions
_ALLOWED_MIME_PREFIXES = ("image/jpeg", "image/jpg", "image/png", "image/webp",
                           "image/bmp", "image/tiff", "image/tif")


def _validate_upload(file: UploadFile) -> None:
    """Raise HTTPException 400 for unsupported or obviously invalid files."""
    content_type = (file.content_type or "").lower()
    if not any(content_type.startswith(p) for p in _ALLOWED_MIME_PREFIXES):
        # Also accept generic octet-stream – extension check is the real guard
        if content_type not in ("application/octet-stream", ""):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported file type '{content_type}'. "
                    f"Accepted types: JPG, PNG, WebP, BMP, TIFF."
                ),
            )

    # Extension check (fallback when content_type is unreliable on Android)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix and suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file extension '{suffix}'. "
                f"Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
            ),
        )


async def _run_prediction(file: UploadFile) -> dict:
    """Shared logic for both /predict and /analyze."""
    _validate_upload(file)

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File too large ({len(image_bytes) // 1024} KB). "
                f"Maximum allowed is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
            ),
        )

    try:
        return disease_service.predict(image_bytes)
    except DiseaseServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during disease inference")
        raise HTTPException(status_code=500, detail="Inference failed unexpectedly.") from exc


# ---------------------------------------------------------------------------
# Primary endpoint  (spec-compliant response shape)
# ---------------------------------------------------------------------------

@router.post("/predict")
async def predict_disease(file: UploadFile = File(...)):
    """
    Analyse a leaf image and return a disease prediction.

    Accepts multipart/form-data with a single field named **file**.

    Response (confident):
    ```json
    {
      "success": true,
      "prediction": {
        "crop": "Tomato",
        "condition": "Late Blight",
        "class_name": "Tomato___Late_blight",
        "is_healthy": false,
        "confidence": 0.9842,
        "status": "confident"
      }
    }
    ```

    Response (uncertain – confidence below threshold):
    ```json
    {
      "success": true,
      "prediction": {
        "crop": null,
        "condition": "Uncertain",
        "class_name": null,
        "is_healthy": null,
        "confidence": 0.41,
        "status": "uncertain"
      }
    }
    ```
    """
    return await _run_prediction(file)


# ---------------------------------------------------------------------------
# Backwards-compatible alias  (existing mobile code calls /analyze)
# ---------------------------------------------------------------------------

@router.post("/analyze")
async def analyze_disease(file: UploadFile = File(...)):
    """
    Alias for /predict kept for backwards compatibility.
    Returns the same spec-compliant response shape.
    """
    return await _run_prediction(file)


# ---------------------------------------------------------------------------
# Status / readiness endpoint
# ---------------------------------------------------------------------------

@router.get("/status")
def get_model_status():
    """Check whether the disease detection model is loaded and ready."""
    # If the module imported successfully, the model is loaded.
    # Any import-time error would have crashed the server already.
    return {
        "model_loaded": True,
        "confidence_threshold": disease_service.CONFIDENCE_THRESHOLD,
        "image_size": list(disease_service.IMAGE_SIZE),
        "num_classes": len(disease_service._label_map),
        "supported_extensions": sorted(disease_service.SUPPORTED_EXTENSIONS),
        "max_upload_mb": disease_service.MAX_UPLOAD_BYTES // (1024 * 1024),
    }
