"""
Leaf disease classifier: the team's MobileNetV2 (PlantVillage, 38 classes, 99.0% test accuracy),
run with Keras 3 on the PyTorch backend so it works on Python versions TensorFlow does not support.
"""
from __future__ import annotations

import io
import json
import os
import threading
from functools import lru_cache

os.environ.setdefault("KERAS_BACKEND", "torch")

import numpy as np
from PIL import Image, ImageOps

from app.config import settings

DIR = settings.models_dir / "disease"
_lock = threading.Lock()

# Treatment notes for the classes that matter to Karnataka growers.
# Doses are standard label rates; the UI always asks the farmer to confirm with a KVK.
ADVICE = {
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {"name": "Grey leaf spot", "kind": "Fungal", "severity": 3,
        "action": ["Spray mancozeb 75% WP at 2.5 g/L, or azoxystrobin 23% SC at 1 ml/L, at first lesions", "Repeat after 10-14 days if humid weather continues"],
        "prevent": "Rotate with a non-cereal crop, plough in residue, and plant tolerant hybrids."},
    "Corn_(maize)___Common_rust_": {"name": "Common rust", "kind": "Fungal", "severity": 2,
        "action": ["Usually no spray is needed late in the season", "If pustules cover lower leaves before tasselling, spray mancozeb 2.5 g/L"],
        "prevent": "Sow on time and grow rust-tolerant hybrids."},
    "Corn_(maize)___Northern_Leaf_Blight": {"name": "Turcicum (northern) leaf blight", "kind": "Fungal", "severity": 4,
        "action": ["Spray mancozeb 2.5 g/L or propiconazole 25% EC at 1 ml/L when long grey lesions appear", "A second spray 10-15 days later in wet spells"],
        "prevent": "Rotate crops, destroy infected residue, choose resistant hybrids."},
    "Tomato___Bacterial_spot": {"name": "Bacterial spot", "kind": "Bacterial", "severity": 3,
        "action": ["Copper oxychloride 3 g/L, repeated every 7-10 days", "Remove badly spotted leaves and avoid overhead irrigation"],
        "prevent": "Use clean seed and seedlings; do not work in the field when plants are wet."},
    "Tomato___Early_blight": {"name": "Early blight", "kind": "Fungal", "severity": 3,
        "action": ["Mancozeb 75% WP at 2.5 g/L or chlorothalonil 2 g/L, every 10 days", "Strip the lowest infected leaves and mulch the soil"],
        "prevent": "Rotate away from tomato, potato and chilli; stake for airflow."},
    "Tomato___Late_blight": {"name": "Late blight", "kind": "Oomycete", "severity": 5,
        "action": ["Act within a day: metalaxyl 8% + mancozeb 64% WP at 2.5 g/L, or cymoxanil + mancozeb at 3 g/L", "Remove and destroy infected plants; repeat spray after 7 days"],
        "prevent": "Spray a protectant before cool, cloudy, wet spells; avoid evening irrigation."},
    "Tomato___Leaf_Mold": {"name": "Leaf mould", "kind": "Fungal", "severity": 2,
        "action": ["Improve ventilation, prune lower leaves", "Chlorothalonil 2 g/L if spreading"], "prevent": "Wider spacing; avoid long leaf wetness."},
    "Tomato___Septoria_leaf_spot": {"name": "Septoria leaf spot", "kind": "Fungal", "severity": 3,
        "action": ["Mancozeb 2.5 g/L or chlorothalonil 2 g/L every 7-10 days", "Remove spotted lower leaves"], "prevent": "Rotate crops and mulch to stop soil splash."},
    "Tomato___Spider_mites Two-spotted_spider_mite": {"name": "Two-spotted spider mite", "kind": "Pest", "severity": 3,
        "action": ["Spray water on leaf undersides; neem oil 5 ml/L", "If severe, a miticide such as fenazaquin 10% EC at 2 ml/L"], "prevent": "Mites build up in hot dry weather; scout leaf undersides weekly."},
    "Tomato___Target_Spot": {"name": "Target spot", "kind": "Fungal", "severity": 3,
        "action": ["Chlorothalonil 2 g/L or azoxystrobin 1 ml/L", "Remove lower infected leaves"], "prevent": "Good airflow and rotation."},
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {"name": "Yellow leaf curl virus", "kind": "Viral", "severity": 5,
        "action": ["No cure: pull out and destroy infected plants early", "Control whitefly: yellow sticky traps, imidacloprid 17.8 SL at 0.3 ml/L"], "prevent": "Insect-proof nursery net and tolerant hybrids."},
    "Tomato___Tomato_mosaic_virus": {"name": "Tomato mosaic virus", "kind": "Viral", "severity": 4,
        "action": ["Remove infected plants", "Wash hands and tools; the virus spreads by touch"], "prevent": "Use certified seed; do not smoke or handle tobacco near plants."},
    "Potato___Early_blight": {"name": "Early blight", "kind": "Fungal", "severity": 3,
        "action": ["Mancozeb 2.5 g/L every 10 days"], "prevent": "Rotation and balanced nitrogen."},
    "Potato___Late_blight": {"name": "Late blight", "kind": "Oomycete", "severity": 5,
        "action": ["Metalaxyl + mancozeb 2.5 g/L immediately; repeat after 7 days"], "prevent": "Certified seed tubers; protectant spray before wet spells."},
    "Pepper,_bell___Bacterial_spot": {"name": "Bacterial spot", "kind": "Bacterial", "severity": 3,
        "action": ["Copper oxychloride 3 g/L every 7-10 days"], "prevent": "Clean seed and no overhead watering."},
}

# Our planner crops the model was trained on.
COVERED = {"maize": "Corn (Maize)", "tomato": "Tomato"}


@lru_cache
def _meta():
    labels = json.loads((DIR / "label_map.json").read_text(encoding="utf8"))
    cfg = json.loads((DIR / "inference_config.json").read_text(encoding="utf8"))
    return labels, cfg


@lru_cache
def _model():
    import keras  # imported lazily so the API starts fast
    return keras.saving.load_model(DIR / "disease_classifier.keras", compile=False)


def info() -> dict:
    labels, cfg = _meta()
    return {"model": "MobileNetV2 (transfer learning), PlantVillage", "classes": len(labels), "testAccuracy": cfg["metrics"]["accuracy"],
            "top3Accuracy": cfg["metrics"]["top3_accuracy"], "threshold": cfg["confidence_threshold"],
            "crops": sorted({l["crop"] for l in labels}), "coveredPlannerCrops": COVERED}


def _plant_share(img: Image.Image) -> float:
    """Share of pixels with leaf-like colour (green, yellow or brown, reasonably saturated)."""
    hsv = np.asarray(img.convert("HSV").resize((96, 96)), dtype=np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    leafy = (s > .18) & (v > .12) & (h >= 15) & (h <= 170)
    return float(leafy.mean())


def _quality(img: Image.Image) -> dict:
    g = np.asarray(img.convert("L").resize((128, 128)), dtype=np.float32)
    lap = np.abs(np.diff(g, 2, axis=0)).mean() + np.abs(np.diff(g, 2, axis=1)).mean()
    return {"brightness": round(float(g.mean()), 1), "sharpness": round(float(lap), 2), "width": img.width, "height": img.height, "plantShare": round(_plant_share(img), 3),
            "warnings": [w for w, bad in [("Photo is very dark", g.mean() < 45), ("Photo is overexposed", g.mean() > 225), ("Photo looks blurry", lap < 2.0), ("Photo is small; use at least 224 px", min(img.size) < 224)] if bad]}


def predict(image_bytes: bytes, crop_hint: str | None = None) -> dict:
    labels, cfg = _meta()
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
    q = _quality(img)
    x = np.asarray(img.resize(tuple(cfg["image_size"]), Image.BILINEAR), dtype=np.float32)[None]
    x = x / 127.5 - 1.0          # mobilenet_v2.preprocess_input, as used in training
    with _lock:
        probs = np.asarray(_model().predict(x, verbose=0))[0]
    order = np.argsort(-probs)
    hint = COVERED.get(crop_hint or "")
    if hint:   # restrict to the farmer's crop if the model knows it
        order = [i for i in order if labels[i]["crop"] == hint]
        mass = float(sum(probs[i] for i in order)) or 1.0
    else:
        mass = 1.0
    top = []
    for i in list(order)[:3]:
        l = labels[i]
        top.append({"className": l["class_name"], "crop": l["crop"], "condition": l["condition"], "isHealthy": l["is_healthy"],
                    "probability": round(float(probs[i]) / mass, 4), "rawProbability": round(float(probs[i]), 4), "advice": ADVICE.get(l["class_name"])})
    best = top[0]
    # Decide on the model's raw probability: re-scaling within one crop must not make a weak guess look confident.
    if q["plantShare"] < 0.15:
        status, note = "not_leaf", "This does not look like a leaf photo, so no diagnosis is given. Photograph one leaf filling the frame, in daylight."
    elif best["rawProbability"] < cfg["confidence_threshold"]:
        status, note = "uncertain", "The model is not sure. Retake the photo: one leaf, filling the frame, on a plain background, in daylight."
    else:
        status, note = "ok", None
    return {"status": status, "top": top, "confidence": best["rawProbability"], "threshold": cfg["confidence_threshold"],
            "quality": q, "restrictedTo": hint, "note": note}
