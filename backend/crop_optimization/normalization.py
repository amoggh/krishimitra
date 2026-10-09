"""
normalization.py — Single canonical normalization layer for Districts, Crops, and Seasons.

Ensures that messy, inconsistent variations in district names, crop names,
and seasons across the 5 real datasets map to single canonical representations.

Source CSVs are NEVER modified. Normalization is strictly in code.
"""

from __future__ import annotations

import re
from typing import Optional


# ---------------------------------------------------------------------------
# District Normalization
# ---------------------------------------------------------------------------

_EXCLUDED_DISTRICT_STRINGS = {
    "state total",
    "state_total",
    "total",
    "all districts",
    "karnataka total",
}

# Mapping observed raw district spellings/formatting to canonical title-cased names
_DISTRICT_MAPPING: dict[str, str] = {
    # Bagalkote
    "bagalkote": "Bagalkote",
    "bagalkot": "Bagalkote",

    # Ballari
    "ballari": "Ballari",
    "bellary": "Ballari",

    # Belagavi
    "belagavi": "Belagavi",
    "belgaum": "Belagavi",

    # Bengaluru Rural
    "bengaluru - rural": "Bengaluru Rural",
    "bengaluru_rural": "Bengaluru Rural",
    "bengaluru rural": "Bengaluru Rural",
    "bangalore rural": "Bengaluru Rural",

    # Bengaluru Urban
    "bengaluru - urban": "Bengaluru Urban",
    "bengaluru _urban": "Bengaluru Urban",
    "bengaluru_rban": "Bengaluru Urban",
    "bengaluru_urban": "Bengaluru Urban",
    "bengaluru urban": "Bengaluru Urban",
    "bangalore urban": "Bengaluru Urban",
    "bangalore": "Bengaluru Urban",
    "bengaluru south": "Bengaluru Urban",

    # Bidar
    "bidar": "Bidar",

    # Chamarajanagar
    "chamarajanagar": "Chamarajanagar",
    "chamarajnagar": "Chamarajanagar",

    # Chikkaballapur
    "chickballapur": "Chikkaballapur",
    "chikkaballapur": "Chikkaballapur",
    "chikballapur": "Chikkaballapur",

    # Chikkamagaluru
    "chikmagalur": "Chikkamagaluru",
    "chickmagalur": "Chikkamagaluru",
    "chikkamagaluru": "Chikkamagaluru",

    # Chitradurga
    "chitradurga": "Chitradurga",

    # Dakshina Kannada
    "dakshina kannada": "Dakshina Kannada",
    "dakshina_kannada": "Dakshina Kannada",
    "south kanara": "Dakshina Kannada",

    # Davanagere
    "davanagere": "Davanagere",
    "davangere": "Davanagere",

    # Dharwad
    "dharwad": "Dharwad",

    # Gadag
    "gadag": "Gadag",

    # Hassan
    "hassan": "Hassan",

    # Haveri
    "haveri": "Haveri",

    # Kalaburagi
    "kalburgi": "Kalaburagi",
    "kalaburagi": "Kalaburagi",
    "gulbarga / kalaburagi": "Kalaburagi",
    "gulbarga": "Kalaburagi",

    # Kodagu
    "kodagu": "Kodagu",
    "kodagu / coorg": "Kodagu",
    "coorg": "Kodagu",

    # Kolar
    "kolar": "Kolar",

    # Koppal
    "koppal": "Koppal",

    # Mandya
    "mandya": "Mandya",

    # Mysuru
    "mysuru": "Mysuru",
    "mysore": "Mysuru",

    # Raichur
    "raichur": "Raichur",

    # Ramanagara
    "ramanagaram": "Ramanagara",
    "ramanagara": "Ramanagara",

    # Shivamogga
    "shivamogga": "Shivamogga",
    "shimoga": "Shivamogga",
    "shimoge": "Shivamogga",

    # Tumakuru
    "tumakuru": "Tumakuru",
    "tumkur": "Tumakuru",

    # Udupi
    "udupi": "Udupi",

    # Uttara Kannada
    "uttara kannada": "Uttara Kannada",
    "uttara_kannada": "Uttara Kannada",
    "north kanara": "Uttara Kannada",

    # Vijayapura
    "vijayapura": "Vijayapura",
    "bijapur": "Vijayapura",
    "bijapur / vijayapura": "Vijayapura",

    # Vijayanagara
    "vijayanagara": "Vijayanagara",
    "vijayanagar": "Vijayanagara",

    # Yadgir
    "yadgir": "Yadgir",
}


def normalize_district(raw_district: Optional[str]) -> Optional[str]:
    """
    Map any observed district string in Karnataka to its canonical name.
    Returns None if raw_district represents an aggregate row (e.g. State Total)
    or is empty.
    """
    if not raw_district or not isinstance(raw_district, str):
        return None

    cleaned = raw_district.strip()
    if not cleaned:
        return None

    lower = cleaned.lower()
    if lower in _EXCLUDED_DISTRICT_STRINGS or "state total" in lower or "state_total" in lower:
        return None

    # Check direct lookup
    if lower in _DISTRICT_MAPPING:
        return _DISTRICT_MAPPING[lower]

    # Handle punctuation variations (replace underscores, multiple spaces, hyphens)
    standardized = re.sub(r"[_\-]+", " ", lower)
    standardized = re.sub(r"\s+", " ", standardized).strip()
    if standardized in _DISTRICT_MAPPING:
        return _DISTRICT_MAPPING[standardized]

    # Partial / substring matches
    for key, canonical in _DISTRICT_MAPPING.items():
        if key == standardized:
            return canonical

    return cleaned.title()


# ---------------------------------------------------------------------------
# Crop Normalization
# ---------------------------------------------------------------------------

_EXCLUDED_CROP_STRINGS = {
    "state total",
    "state_total",
    "total cereals",
    "total pulses",
    "total foodgrains",
    "total oilseeds",
    "other pulses",
    "other  rabi pulses",
    "other kharif pulses",
    "peas & beans (pulses)",
    "save includes",
    "save includes haraka barley korle oodhalu minor millets baragu and badlivar area in hectares production",
    "fruits and vegetables area",
    "fodder area",
    "minor pulses area",
    "minor pulses yield",
    "oilseeds area",
    "oilseeds yield",
    "sorghum area",
    "sorghum yield",
}

_CROP_MAPPING: dict[str, str] = {
    # Finger Millet / Ragi
    "ragi": "Ragi / Finger Millet",
    "finger millet": "Ragi / Finger Millet",
    "finger millet yield (kg per ha)": "Ragi / Finger Millet",

    # Maize
    "maize": "Maize",
    "maize yield (kg per ha)": "Maize",
    "makka": "Maize",

    # Groundnut
    "groundnut": "Groundnut",
    "groundnut yield (kg per ha)": "Groundnut",
    "peanut": "Groundnut",

    # Sorghum / Jowar
    "jowar": "Jowar / Sorghum",
    "sorghum": "Jowar / Sorghum",
    "kharif sorghum": "Jowar / Sorghum",
    "rabi sorghum": "Jowar / Sorghum",
    "kharif sorghum yield (kg per ha)": "Jowar / Sorghum",
    "rabi sorghum yield (kg per ha)": "Jowar / Sorghum",
    "jowar(sorghum)": "Jowar / Sorghum",

    # Pearl Millet / Bajra
    "bajra": "Bajra / Pearl Millet",
    "pearl millet": "Bajra / Pearl Millet",
    "pearl millet yield (kg per ha)": "Bajra / Pearl Millet",
    "bajra(pearl millet/cumbu)": "Bajra / Pearl Millet",

    # Rice / Paddy
    "rice": "Rice / Paddy",
    "paddy": "Rice / Paddy",
    "rice yield (kg per ha)": "Rice / Paddy",

    # Cotton
    "cotton": "Cotton",
    "cotton(lint)": "Cotton",
    "cotton yield (kg per ha)": "Cotton",

    # Sugarcane
    "sugarcane": "Sugarcane",
    "sugarcane harvested": "Sugarcane",
    "sugarcane planted": "Sugarcane",
    "sugarcane yield (kg per ha)": "Sugarcane",

    # Onion
    "onion": "Onion",
    "onion yield (kg per ha)": "Onion",

    # Bengalgram / Chickpea
    "bengalgram": "Bengalgram / Chickpea",
    "gram": "Bengalgram / Chickpea",
    "chickpea": "Bengalgram / Chickpea",
    "chickpea yield (kg per ha)": "Bengalgram / Chickpea",
    "bengal gram(gram)(whole)": "Bengalgram / Chickpea",

    # Tur / Pigeonpea
    "tur": "Tur / Pigeonpea",
    "arhar/tur": "Tur / Pigeonpea",
    "pigeonpea": "Tur / Pigeonpea",
    "pigeonpea yield (kg per ha)": "Tur / Pigeonpea",
    "arhar": "Tur / Pigeonpea",
    "redgram": "Tur / Pigeonpea",

    # Sunflower
    "sunflower": "Sunflower",
    "sunflower yield (kg per ha)": "Sunflower",
    "sunflower/sunflower seed": "Sunflower",

    # Soyabean
    "soyabean": "Soyabean",
    "soybean": "Soyabean",
    "soyabean yield (kg per ha)": "Soyabean",

    # Safflower
    "safflower": "Safflower",
    "safflower yield (kg per ha)": "Safflower",

    # Sesamum
    "sesamum": "Sesamum",
    "sesame": "Sesamum",
    "sesamum yield (kg per ha)": "Sesamum",

    # Wheat
    "wheat": "Wheat",
    "wheat yield (kg per ha)": "Wheat",

    # Castor
    "castor": "Castor",
    "castor seed": "Castor",
    "castor yield (kg per ha)": "Castor",

    # Linseed
    "linseed": "Linseed",
    "linseed yield (kg per ha)": "Linseed",

    # Potato
    "potato": "Potato",
    "potatoes": "Potato",

    # Tomato
    "tomato": "Tomato",

    # Coconut
    "coconut": "Coconut",
    "coconutprocessed": "Coconut",

    # Blackgram / Urad
    "blackgram": "Blackgram / Urad",
    "urad": "Blackgram / Urad",

    # Greengram / Moong
    "greengram": "Greengram / Moong",
    "moong(green gram)": "Greengram / Moong",

    # Cowpea
    "cowpea": "Cowpea",
    "cowpea(lobia)": "Cowpea",

    # Horsegram
    "horsegram": "Horsegram",
    "horse-gram": "Horsegram",

    # Avare
    "avare": "Avare",
    "green avare(w)": "Avare",

    # Spices / Plantation
    "arecanut": "Arecanut",
    "arecanutprocessed": "Arecanut",
    "arecanutrawnuts": "Arecanut",
    "cashewnut": "Cashewnut",
    "cashewnutprocessed": "Cashewnut",
    "cashewnutrawnuts": "Cashewnut",
    "cardamom": "Cardamom",
    "cardamum": "Cardamom",
    "black pepper": "Black Pepper",
    "coriander": "Coriander",
    "garlic": "Garlic",
    "ginger": "Ginger",
    "fresh ginger": "Ginger",
    "dry ginger": "Ginger",
    "ginger(green)": "Ginger",
    "turmeric": "Turmeric",
    "turmericfresh": "Turmeric",
    "turmericprocessed": "Turmeric",
    "tobacco": "Tobacco",
    "tobbaco": "Tobacco",
}


def normalize_crop(raw_crop: Optional[str]) -> Optional[str]:
    """
    Map raw crop names across datasets to canonical agronomic representations.
    Returns None if raw_crop represents an aggregate/summary category or is empty.
    """
    if not raw_crop or not isinstance(raw_crop, str):
        return None

    cleaned = raw_crop.strip()
    if not cleaned:
        return None

    lower = cleaned.lower()

    # Check excluded summary strings
    if lower in _EXCLUDED_CROP_STRINGS:
        return None

    for excl in _EXCLUDED_CROP_STRINGS:
        if excl in lower:
            return None

    if lower in _CROP_MAPPING:
        return _CROP_MAPPING[lower]

    # Clean punctuation and extra spaces
    standardized = re.sub(r"\s+", " ", lower).strip()
    if standardized in _CROP_MAPPING:
        return _CROP_MAPPING[standardized]

    return cleaned.title()


# ---------------------------------------------------------------------------
# Season Normalization
# ---------------------------------------------------------------------------

def normalize_season(raw_season: Optional[str]) -> str:
    """
    Normalize season to one of 'kharif', 'rabi', 'summer', or 'annual'.
    'zaid' maps to 'summer'.
    """
    if not raw_season or not isinstance(raw_season, str):
        return "kharif"

    s = raw_season.strip().lower()
    if "kharif" in s:
        return "kharif"
    if "rabi" in s:
        return "rabi"
    if "summer" in s or "zaid" in s:
        return "summer"
    if "annual" in s or "whole year" in s:
        return "annual"

    return "kharif"
