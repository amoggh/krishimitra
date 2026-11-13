import logging
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from app.services.disease_service import (
    DiseaseServiceError,
    disease_service,
)

from app.services.pesticide_recommendations import (
    get_pesticide_recommendations,
)

from app.services.pesticide_prices import (
    get_prices,
)


logger = logging.getLogger(__name__)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/disease",
    tags=["Disease Detection"],
)


# ============================================================
# UPLOAD CONFIGURATION
# ============================================================

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}

SUPPORTED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


# ============================================================
# VALIDATE UPLOAD
# ============================================================

def _validate_upload(file: UploadFile):
    """Validate uploaded image."""

    extension = Path(
        file.filename or ""
    ).suffix.lower()

    content_type = (
        file.content_type or ""
    ).lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image extension. "
                "Use JPG, JPEG, PNG, WebP, BMP or TIFF."
            ),
        )

    if content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type.",
        )


# ============================================================
# RUN PREDICTION
# ============================================================

async def _run_prediction(
    file: UploadFile,
    state: str = "Karnataka",
    district: Optional[str] = None,
):
    """
    Complete disease detection pipeline:

    Image
       ↓
    MobileNetV2
       ↓
    Disease + Confidence
       ↓
    Verified pesticide recommendation
       ↓
    Online pesticide price
    """

    # --------------------------------------------------------
    # 1. Validate file
    # --------------------------------------------------------

    _validate_upload(file)

    # --------------------------------------------------------
    # 2. Read image
    # --------------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    # --------------------------------------------------------
    # 3. Check file size
    # --------------------------------------------------------

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image size exceeds 10 MB.",
        )

    # --------------------------------------------------------
    # 4. Normalize location
    # --------------------------------------------------------

    state = (
        state.strip()
        if state
        else "Karnataka"
    )

    district = (
        district.strip()
        if district
        else None
    )

    try:

        # ====================================================
        # STEP 1
        # ML DISEASE DETECTION
        # ====================================================

        result = disease_service.predict(
            image_bytes
        )

        # result should look like:
        #
        # {
        #     "success": True,
        #     "prediction": {
        #         "crop": "Tomato",
        #         "condition": "Early Blight",
        #         "class_name": "Tomato___Early_blight",
        #         "is_healthy": False,
        #         "confidence": 0.91,
        #         "status": "confident"
        #     }
        # }

        prediction = result.get(
            "prediction",
            {},
        )

        # ----------------------------------------------------
        # Extract prediction information
        # ----------------------------------------------------

        class_name = prediction.get(
            "class_name"
        )

        model_status = prediction.get(
            "status"
        )

        is_healthy = prediction.get(
            "is_healthy",
            False,
        )

        # ====================================================
        # STEP 2
        # PESTICIDE RECOMMENDATION
        # ====================================================

        pesticides = []
        pesticide_status = "no_verified_recommendation"

        # Only recommend pesticides when:
        #
        # 1. A disease class exists
        # 2. Model confidence is sufficient
        # 3. Plant is not healthy

        if (
            class_name
            and model_status == "confident"
            and not is_healthy
        ):

            # IMPORTANT:
            #
            # class_name is already a STRING.
            #
            # Example:
            # "Tomato___Early_blight"
            #
            # Do NOT use:
            # prediction["prediction"]
            #
            # because prediction is already the prediction dictionary.

            try:
                pesticides = await get_pesticide_recommendations(
                    crop=prediction.get("crop"),
                    disease=prediction.get("condition"),
                )
            except Exception:
                logger.exception(
                    "External pesticide recommendation lookup failed"
                )
                pesticide_status = "source_unavailable"
            else:
                if pesticides:
                    pesticide_status = "reference_available"

        # ====================================================
        # STEP 3
        # ONLINE PESTICIDE PRICE
        # ====================================================

        pesticide_prices = []
        price_status = "not_applicable"

        if pesticides:
            # Extract only active ingredients.
            #
            # Example:
            #
            # pesticides = [
            #     {
            #         "product": "Mancozeb 75% WP",
            #         "active_ingredient": "Mancozeb",
            #         ...
            #     }
            # ]

            active_ingredients = [
                item.get(
                    "active_ingredient"
                )
                for item in pesticides
                if item.get(
                    "active_ingredient"
                )
            ]

            # Remove duplicates while
            # preserving order.

            active_ingredients = list(
                dict.fromkeys(
                    active_ingredients
                )
            )

            if active_ingredients:
                price_status = "unavailable"
                try:
                    pesticide_prices = await get_prices(
                        active_ingredients=active_ingredients,
                        state=state,
                        district=district,
                    )
                except Exception:
                    logger.exception(
                        "Online pesticide price lookup failed"
                    )
                else:
                    if pesticide_prices:
                        price_status = "live_reference"

        # ====================================================
        # STEP 4
        # FINAL RESPONSE
        # ====================================================

        result["pesticides"] = pesticides

        result["pesticide_prices"] = (
            pesticide_prices
        )

        result["pesticide_status"] = pesticide_status
        result["price_status"] = price_status

        result["location"] = {
            "state": state,
            "district": district,
        }

        result["price_note"] = (
            "Online reference price. Actual local dealer price may differ."
        )

        return result

    # ========================================================
    # KNOWN DISEASE SERVICE ERROR
    # ========================================================

    except DiseaseServiceError as exc:

        logger.warning(
            "Disease service error: %s",
            exc,
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # ========================================================
    # FASTAPI ERROR
    # ========================================================

    except HTTPException:
        raise

    # ========================================================
    # UNKNOWN ERROR
    # ========================================================

    except Exception as exc:

        logger.exception(
            "Unexpected disease API error"
        )

        # During development, return the
        # actual error so we can identify
        # problems quickly.

        raise HTTPException(
            status_code=500,
            detail=(
                f"{type(exc).__name__}: {exc}"
            ),
        ) from exc


# ============================================================
# POST /predict
# ============================================================

@router.post("/predict")
async def predict_disease(
    file: UploadFile = File(...),

    state: str = Form(
        "Karnataka"
    ),

    district: Optional[str] = Form(
        None
    ),
):

    return await _run_prediction(
        file=file,
        state=state,
        district=district,
    )


# ============================================================
# POST /analyze
# ============================================================

@router.post("/analyze")
async def analyze_disease(
    file: UploadFile = File(...),

    state: str = Form(
        "Karnataka"
    ),

    district: Optional[str] = Form(
        None
    ),
):

    return await _run_prediction(
        file=file,
        state=state,
        district=district,
    )


# ============================================================
# GET /status
# ============================================================

@router.get("/status")
async def disease_status():

    try:

        # Load model/resources if not already loaded.
        disease_service._load_resources()

        config = (
            disease_service.config
            or {}
        )

        label_map = (
            disease_service.label_map
        )

        # Calculate number of classes.
        if isinstance(
            label_map,
            list,
        ):

            num_classes = len(
                label_map
            )

        elif isinstance(
            label_map,
            dict,
        ):

            num_classes = len(
                label_map
            )

        else:

            num_classes = 0

        return {
            "model_loaded": (
                disease_service.model
                is not None
            ),

            "confidence_threshold": (
                config.get(
                    "confidence_threshold",
                    0.55,
                )
            ),

            "image_size": [
                224,
                224,
            ],

            "num_classes": (
                num_classes
            ),

            "supported_extensions": (
                sorted(
                    SUPPORTED_EXTENSIONS
                )
            ),

            "max_upload_mb": 10,
        }

    except DiseaseServiceError as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc