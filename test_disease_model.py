import json
from pathlib import Path

import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model


# Paths
PROJECT_ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts" / "disease_detection"

MODEL_PATH = ARTIFACTS_DIR / "disease_classifier.keras"
LABEL_MAP_PATH = ARTIFACTS_DIR / "label_map.json"
CONFIG_PATH = ARTIFACTS_DIR / "inference_config.json"


# Load model
print("Loading model...")
model = load_model(MODEL_PATH)

print("Model loaded successfully!")


# Load label map
with open(LABEL_MAP_PATH, "r") as f:
    label_map = json.load(f)

print(f"Number of classes: {len(label_map)}")


# Show configuration
with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

print("Inference config:")
print(config)


# Show model information
print("\nModel input shape:", model.input_shape)
print("Model output shape:", model.output_shape)

from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# CHANGE THIS to the path of ONE actual test image
IMAGE_PATH = Path(
    r"C:\Users\Amoggh Bharadwaj\KrushiMitra\dataset-plant disease\test\test\AppleCedarRust1.JPG"
)

IMAGE_SIZE = (224, 224)

# Load image
image = Image.open(IMAGE_PATH).convert("RGB")

# Resize
image = image.resize(IMAGE_SIZE)

# Convert to NumPy
image_array = np.array(image, dtype=np.float32)

# MobileNetV2 preprocessing
image_array = preprocess_input(image_array)

# Add batch dimension
image_array = np.expand_dims(image_array, axis=0)

# Run model
predictions = model.predict(image_array, verbose=0)

# Get highest probability class
predicted_index = int(np.argmax(predictions[0]))
confidence = float(predictions[0][predicted_index])

# Get information from label map
predicted_class = label_map[predicted_index]

print("\n========== DISEASE PREDICTION ==========")
print("Crop       :", predicted_class["crop"])
print("Condition  :", predicted_class["condition"])
print("Healthy    :", predicted_class["is_healthy"])
print("Confidence :", f"{confidence * 100:.2f}%")
print("Class ID   :", predicted_index)