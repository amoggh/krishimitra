import io
import json
import logging
from pathlib import Path
from typing import Any, Dict

import numpy as np
from PIL import Image, UnidentifiedImageError
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model


logger = logging.getLogger(__name__)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_DIR = (
    BASE_DIR
    / "artifacts"
    / "disease_detection"
)

MODEL_PATH = (
    MODEL_DIR
    / "disease_classifier.keras"
)

LABEL_MAP_PATH = (
    MODEL_DIR
    / "label_map.json"
)

INFERENCE_CONFIG_PATH = (
    MODEL_DIR
    / "inference_config.json"
)


# ============================================================
# EXCEPTION
# ============================================================

class DiseaseServiceError(Exception):
    """Raised when disease model inference fails."""


# ============================================================
# SERVICE
# ============================================================

class DiseaseService:

    def __init__(self):
        self.model = None
        self.label_map = None
        self.config = None

    # --------------------------------------------------------
    # LOAD MODEL
    # --------------------------------------------------------

    def _load_resources(self):

        if self.model is not None:
            return

        try:

            if not MODEL_PATH.exists():
                raise DiseaseServiceError(
                    f"Disease model not found: {MODEL_PATH}"
                )

            if not LABEL_MAP_PATH.exists():
                raise DiseaseServiceError(
                    f"Label map not found: {LABEL_MAP_PATH}"
                )

            if not INFERENCE_CONFIG_PATH.exists():
                raise DiseaseServiceError(
                    f"Inference config not found: {INFERENCE_CONFIG_PATH}"
                )

            logger.info(
                "Loading disease detection model..."
            )

            self.model = load_model(
                MODEL_PATH
            )

            with open(
                LABEL_MAP_PATH,
                "r",
                encoding="utf-8"
            ) as file:

                self.label_map = json.load(
                    file
                )

            with open(
                INFERENCE_CONFIG_PATH,
                "r",
                encoding="utf-8"
            ) as file:

                self.config = json.load(
                    file
                )

            logger.info(
                "Disease detection model loaded successfully"
            )

        except DiseaseServiceError:
            raise

        except Exception as exc:

            logger.exception(
                "Failed to load disease detection model"
            )

            raise DiseaseServiceError(
                f"Failed to load disease model: {exc}"
            ) from exc

    # --------------------------------------------------------
    # VALIDATE IMAGE
    # --------------------------------------------------------

    def _validate_image(
        self,
        image_bytes: bytes
    ):

        if not image_bytes:
            raise DiseaseServiceError(
                "Empty image received"
            )

        try:

            image = Image.open(
                io.BytesIO(image_bytes)
            )

            image.verify()

        except (
            UnidentifiedImageError,
            OSError
        ) as exc:

            raise DiseaseServiceError(
                "Uploaded file is not a valid image"
            ) from exc

    # --------------------------------------------------------
    # PREPROCESS IMAGE
    # --------------------------------------------------------

    def _prepare_image(
        self,
        image_bytes: bytes
    ):

        try:

            image = Image.open(
                io.BytesIO(image_bytes)
            )

            image = image.convert(
                "RGB"
            )

            image = image.resize(
                (224, 224)
            )

            image_array = np.asarray(
                image,
                dtype=np.float32
            )

            image_array = np.expand_dims(
                image_array,
                axis=0
            )

            image_array = preprocess_input(
                image_array
            )

            return image_array

        except Exception as exc:

            raise DiseaseServiceError(
                f"Unable to preprocess image: {exc}"
            ) from exc

    # --------------------------------------------------------
    # CLASS NAME
    # --------------------------------------------------------

    def _get_class_name(
        self,
        class_index: int
    ) -> str:

        # Example:
        # [
        #   "Apple___Apple_scab",
        #   "Apple___Black_rot"
        # ]

        if isinstance(
            self.label_map,
            list
        ):

            if (
                class_index < 0
                or class_index >= len(
                    self.label_map
                )
            ):

                raise DiseaseServiceError(
                    f"Invalid class index: {class_index}"
                )

            label = self.label_map[
                class_index
            ]

            if isinstance(label, dict):
                if label.get("class_id") != class_index:
                    label = next(
                        (
                            item
                            for item in self.label_map
                            if isinstance(item, dict)
                            and item.get("class_id") == class_index
                        ),
                        label,
                    )

                label = label.get("class_name")

            if isinstance(label, str):
                return label

            raise DiseaseServiceError(
                f"Label map entry for class index {class_index} "
                "does not contain a string class_name."
            )

        # Example:
        # {
        #   "0": "Apple___Apple_scab"
        # }

        if isinstance(
            self.label_map,
            dict
        ):

            if str(class_index) in self.label_map:
                label = self.label_map[
                    str(class_index)
                ]

                if isinstance(label, dict):
                    label = label.get("class_name")

                if isinstance(label, str):
                    return label

            # Example:
            # {
            #   "Apple___Apple_scab": 0
            # }

            for class_name, index in (
                self.label_map.items()
            ):

                if index == class_index:
                    if isinstance(class_name, str):
                        return class_name

        raise DiseaseServiceError(
            f"Unable to resolve a string class name for class index: "
            f"{class_index}"
        )

    # --------------------------------------------------------
    # PARSE CLASS
    # --------------------------------------------------------

    def _parse_class_name(
        self,
        class_name: str
    ):

        if "___" in class_name:

            crop, condition = (
                class_name.split(
                    "___",
                    1
                )
            )

        else:

            crop = class_name
            condition = class_name

        condition = (
            condition
            .replace("_", " ")
        )

        return crop, condition

    # --------------------------------------------------------
    # PREDICT
    # --------------------------------------------------------

    def predict(
        self,
        image_bytes: bytes
    ) -> Dict[str, Any]:

        """
        Run MobileNetV2 disease prediction.

        This function ONLY performs:
        image validation
        image preprocessing
        model inference
        disease classification

        Pesticide recommendation and price lookup
        are handled separately.
        """

        self._load_resources()

        self._validate_image(
            image_bytes
        )

        image_array = (
            self._prepare_image(
                image_bytes
            )
        )

        try:

            predictions = (
                self.model.predict(
                    image_array,
                    verbose=0
                )
            )

            probabilities = (
                predictions[0]
            )

            class_index = int(
                np.argmax(
                    probabilities
                )
            )

            confidence = float(
                probabilities[
                    class_index
                ]
            )

            class_name = (
                self._get_class_name(
                    class_index
                )
            )

            crop, condition = (
                self._parse_class_name(
                    class_name
                )
            )

            threshold = float(
                self.config.get(
                    "confidence_threshold",
                    0.55
                )
            )

            is_healthy = (
                "healthy"
                in condition.lower()
            )

            status = (
                "confident"
                if confidence >= threshold
                else "uncertain"
            )

            return {

                "success": True,

                "prediction": {

                    "crop": crop,

                    "condition": condition,

                    "class_name": class_name,

                    "is_healthy": (
                        is_healthy
                    ),

                    "confidence": round(
                        confidence,
                        4
                    ),

                    "status": status
                }
            }

        except DiseaseServiceError:
            raise

        except Exception as exc:

            logger.exception(
                "Disease prediction failed"
            )

            raise DiseaseServiceError(
                f"Disease prediction failed: {exc}"
            ) from exc


# ============================================================
# SINGLETON
# ============================================================

disease_service = DiseaseService()