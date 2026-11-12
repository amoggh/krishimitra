"""
Fertilizer & Pesticide Recommendation Service.

Tailored to:
1. Farmer's Location (Karnataka District & Agro-climatic zone soil characteristics)
2. Farmer's Budget Tier (Low/Organic, Standard/UAS-ICAR POP, High-Yield/Commercial)
3. Crop & Growth Stage / Disease context

Outputs in simple, practical farmer units:
- Commercial retail bags (e.g. 50 kg DAP, 45 kg Urea)
- Kilograms per acre
- Mixing ratios per 15-liter backpack spray pump
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Regional Soil Knowledge Base (Karnataka Districts)
# ---------------------------------------------------------------------------
DISTRICT_SOIL_DATA: dict[str, dict] = {
    "mandya": {
        "zone": "Southern Dry Zone",
        "soil_type": "Red Sandy Loam",
        "ph": 6.5,
        "texture": "Light to medium, well-drained",
        "deficiencies": ["Nitrogen (High)", "Zinc (Moderate)", "Organic Matter"],
        "advisory": "Red sandy loam has high percolation; split nitrogen application into 2–3 doses to prevent leaching losses.",
    },
    "mysuru": {
        "zone": "Southern Dry Zone",
        "soil_type": "Red Loam to Mixed Black",
        "ph": 6.7,
        "texture": "Medium loam with good moisture retention",
        "deficiencies": ["Zinc (Moderate)", "Nitrogen"],
        "advisory": "Good organic response; incorporate 2–3 tonnes of Farm Yard Manure (FYM) before basal application.",
    },
    "belagavi": {
        "zone": "Northern Transition / Dry Zone",
        "soil_type": "Medium to Deep Black Soil (Regur)",
        "ph": 7.5,
        "texture": "Clayey, high water-holding capacity",
        "deficiencies": ["Phosphorus fixation", "Iron (in calcarous patches)", "Zinc"],
        "advisory": "Black soils have high clay and potassium; reduce MOP by 15% and place phosphatic fertilizers deep in the root zone.",
    },
    "dharwad": {
        "zone": "Northern Transition Zone",
        "soil_type": "Medium Black Soil",
        "ph": 7.4,
        "texture": "Clay loam, moderate drainage",
        "deficiencies": ["Zinc", "Sulfur", "Nitrogen"],
        "advisory": "Incorporate sulfur along with basal fertilizer to boost protein and oil content in pulses and oilseeds.",
    },
    "bengaluru rural": {
        "zone": "Eastern Dry Zone",
        "soil_type": "Red Sandy Loam",
        "ph": 6.3,
        "texture": "Coarse to loamy sand",
        "deficiencies": ["Boron", "Zinc", "Nitrogen"],
        "advisory": "Mildly acidic soil; apply Boron (1 kg/acre) during flowering stage to prevent flower drop in vegetables.",
    },
    "kolar": {
        "zone": "Eastern Dry Zone",
        "soil_type": "Red Sandy Loam to Clayey Loam",
        "ph": 6.4,
        "texture": "Light texture, low water table",
        "deficiencies": ["Zinc", "Boron", "Organic Carbon"],
        "advisory": "Water-scarce zone; use organic mulching or neem-coated urea to maximize nitrogen retention.",
    },
    "shivamogga": {
        "zone": "Southern Transition / Hilly Zone",
        "soil_type": "Lateritic Red Soil",
        "ph": 5.8,
        "texture": "Loamy to clayey, porous",
        "deficiencies": ["Phosphorus (High fixation)", "Calcium", "Magnesium"],
        "advisory": "Acidic laterite soils fix phosphorus; apply 150 kg Agricultural Lime or Dolomite per acre every 3 years.",
    },
    "udupi": {
        "zone": "Coastal Zone",
        "soil_type": "Acidic Coastal Laterite",
        "ph": 5.2,
        "texture": "Coarse sand to gravelly loam",
        "deficiencies": ["Potash (High leaching)", "Calcium", "Boron"],
        "advisory": "Heavy monsoon rainfall leaches nutrients quickly; apply potash and nitrogen in small frequent splits.",
    },
    "ballari": {
        "zone": "Northern Dry Zone",
        "soil_type": "Deep Black Cotton Soil",
        "ph": 8.1,
        "texture": "Heavy clay, prone to surface crusting",
        "deficiencies": ["Zinc", "Iron", "Nitrogen"],
        "advisory": "Alkaline black soil; apply Zinc Sulphate (10 kg/acre) separately from phosphatic fertilizers to prevent lockup.",
    },
    "kalaburagi": {
        "zone": "North Eastern Dry Zone",
        "soil_type": "Deep Black Soil",
        "ph": 7.8,
        "texture": "Heavy clay with high cracking",
        "deficiencies": ["Sulfur", "Zinc", "Nitrogen"],
        "advisory": "Premier pulse belt (Tur/Bengalgram); seed treatment with Rhizobium + PSB saves 25% chemical nitrogen.",
    },
    "hassan": {
        "zone": "Southern Transition Zone",
        "soil_type": "Red Sandy Loam to Lateritic",
        "ph": 6.2,
        "texture": "Medium loam, good organic matter",
        "deficiencies": ["Zinc", "Magnesium"],
        "advisory": "Moderate climate favors potato, maize, and ginger; apply Micronutrient Grade-1 spray at 35 days.",
    },
}

# Fallback default for districts not explicitly listed above
DEFAULT_SOIL_DATA = {
    "zone": "Karnataka Agro-climatic Zone",
    "soil_type": "Red Loam / Medium Black",
    "ph": 6.6,
    "texture": "Medium loam with moderate fertility",
    "deficiencies": ["Nitrogen", "Zinc", "Organic Carbon"],
    "advisory": "Follow local UAS Karnataka Package of Practices; apply Zinc Sulphate 10 kg/acre once a year.",
}


# ---------------------------------------------------------------------------
# Crop Agronomic Fertilizer Schedules (Per Acre)
# ---------------------------------------------------------------------------
CROP_FERTILIZER_DATABASE: dict[str, dict] = {
    "ragi": {
        "crop_name": "Ragi (Finger Millet)",
        "low_budget": {
            "tier_label": "Low Budget / Organic-Assisted",
            "cost_per_acre": 1850,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing / Transplanting)",
                    "timing_days": "Day 0",
                    "what_to_apply": "2 tonnes Well-decomposed Cow Dung / FYM + ½ bag (25 kg) DAP + 5 kg Bio-fertilizer (Azospirillum)",
                    "farmer_instructions": "Mix FYM and bio-fertilizer in the field 5 days before sowing. Apply DAP along the furrow.",
                    "estimated_cost_inr": 1100,
                },
                {
                    "stage_name": "2. Vegetative Top-Dressing (25–30 Days)",
                    "timing_days": "25–30 days after sowing",
                    "what_to_apply": "½ bag (22 kg) Neem-coated Urea",
                    "farmer_instructions": "Weed the field first. Broadcast urea in the evening when soil has adequate moisture.",
                    "estimated_cost_inr": 350,
                },
                {
                    "stage_name": "3. Flowering / Earhead Emergence (50–60 Days)",
                    "timing_days": "50–55 days after sowing",
                    "what_to_apply": "Panchagavya (3%) foliar spray or Jeevamrutha drenching",
                    "farmer_instructions": "Mix 450 ml Panchagavya in 15 liters of water (one spray pump). Spray over the foliage.",
                    "estimated_cost_inr": 400,
                },
            ],
        },
        "standard_budget": {
            "tier_label": "Standard Recommended (UAS Package of Practices)",
            "cost_per_acre": 3400,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing / Transplanting)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) DAP + ½ bag (25 kg) MOP (Potash) + 10 kg Zinc Sulphate (21%)",
                    "farmer_instructions": "Apply DAP and Potash 5 cm below seed level in the furrows. Do not mix Zinc directly with DAP.",
                    "estimated_cost_inr": 2250,
                },
                {
                    "stage_name": "2. Tillering & Stem Elongation (30 Days)",
                    "timing_days": "30 days after sowing",
                    "what_to_apply": "1 bag (45 kg) Neem-coated Urea",
                    "farmer_instructions": "Broadcast after weeding during light soil moisture. Do not apply if heavy rain is expected within 24 hrs.",
                    "estimated_cost_inr": 450,
                },
                {
                    "stage_name": "3. Grain Filling & Maturity (55–60 Days)",
                    "timing_days": "55–60 days after sowing",
                    "what_to_apply": "Water-soluble 19:19:19 (1 kg) + Boron (250 g)",
                    "farmer_instructions": "Dissolve 75 grams of 19:19:19 + 15 grams Boron per 15-liter spray pump. Spray on earheads for bold grain filling.",
                    "estimated_cost_inr": 700,
                },
            ],
        },
        "high_budget": {
            "tier_label": "High-Yield Commercial Plan",
            "cost_per_acre": 5800,
            "stages": [
                {
                    "stage_name": "1. Basal Soil Enrichment (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) 20:20:0:13 (Sulphate of Phosphate) + 1 bag (50 kg) MOP + 10 kg Chelated Zinc",
                    "farmer_instructions": "Provides enriched sulfur and potash for maximum tiller development. Broadcast and incorporate into top 10 cm soil.",
                    "estimated_cost_inr": 3200,
                },
                {
                    "stage_name": "2. Peak Tillering Stage (28–32 Days)",
                    "timing_days": "30 days",
                    "what_to_apply": "1 bag (45 kg) Urea + Humic Acid granules (5 kg)",
                    "farmer_instructions": "Top-dress with humic acid to stimulate deep secondary root networks and nitrogen absorption.",
                    "estimated_cost_inr": 1100,
                },
                {
                    "stage_name": "3. Flag Leaf & Grain Booting (50–60 Days)",
                    "timing_days": "55 days",
                    "what_to_apply": "Foliar spray with 0:52:34 (Monopotassium Phosphate, 1.5 kg) + Micronutrient Cocktail (500 ml)",
                    "farmer_instructions": "Dissolve 100g 0:52:34 + 30ml micronutrient mix per 15-liter spray pump. Guarantees 20–25% heavier grain weight.",
                    "estimated_cost_inr": 1500,
                },
            ],
        },
    },
    "maize": {
        "crop_name": "Maize (Corn)",
        "low_budget": {
            "tier_label": "Low Budget / Cost-Optimized",
            "cost_per_acre": 2600,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) DAP + 1 bag FYM with Azotobacter",
                    "farmer_instructions": "Place DAP in furrows 5 cm away from seed line.",
                    "estimated_cost_inr": 1600,
                },
                {
                    "stage_name": "2. Knee-High Stage (30–35 Days)",
                    "timing_days": "30–35 days",
                    "what_to_apply": "1 bag (45 kg) Urea",
                    "farmer_instructions": "Apply near the root zone and earth up soil around stalks to support fast growing plants.",
                    "estimated_cost_inr": 450,
                },
                {
                    "stage_name": "3. Tasseling & Silking Stage (55–60 Days)",
                    "timing_days": "55–60 days",
                    "what_to_apply": "½ bag (22 kg) Urea top-dressing",
                    "farmer_instructions": "Light top-dressing before tassel emergence to ensure complete cob grain setting.",
                    "estimated_cost_inr": 550,
                },
            ],
        },
        "standard_budget": {
            "tier_label": "Standard Recommended (UAS Bengaluru/Dharwad)",
            "cost_per_acre": 4600,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) DAP + 1 bag (50 kg) MOP (Potash) + 10 kg Zinc Sulphate (21%)",
                    "farmer_instructions": "Maize is a heavy feeder. Apply full DAP and Potash at sowing. Keep Zinc separate from DAP.",
                    "estimated_cost_inr": 2900,
                },
                {
                    "stage_name": "2. Knee-High Vegetative Stage (30–35 Days)",
                    "timing_days": "30–35 days",
                    "what_to_apply": "1 bag (45 kg) Urea + 1 kg Magnesium Sulphate",
                    "farmer_instructions": "Crucial stage for cob initiation. Band-place urea 10 cm from stalk and irrigate within 24 hours.",
                    "estimated_cost_inr": 750,
                },
                {
                    "stage_name": "3. Tasseling & Cob Formation (55–60 Days)",
                    "timing_days": "55–60 days",
                    "what_to_apply": "1 bag (45 kg) Urea + Foliar Spray with 13:0:45 (Potassium Nitrate, 1 kg)",
                    "farmer_instructions": "Spray 75 grams of 13:0:45 per 15L spray tank. Prevents tip-unfilled cobs and ensures full grain filling.",
                    "estimated_cost_inr": 950,
                },
            ],
        },
        "high_budget": {
            "tier_label": "High-Yield Commercial Hybrid Plan",
            "cost_per_acre": 7200,
            "stages": [
                {
                    "stage_name": "1. Basal Soil Loading (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1.5 bags (75 kg) DAP + 1 bag (50 kg) Potash + 10 kg Zinc + 10 kg Sulfur 90% granules",
                    "farmer_instructions": "Incorporate thoroughly into seed bed for rapid early seedling vigour and root anchorage.",
                    "estimated_cost_inr": 4200,
                },
                {
                    "stage_name": "2. Rapid Vegetative Stage (30 Days)",
                    "timing_days": "30 days",
                    "what_to_apply": "1.5 bags (68 kg) Urea + Bio-stimulant sea-weed granules (5 kg)",
                    "farmer_instructions": "Deep furrow application followed by earthing up and immediate irrigation.",
                    "estimated_cost_inr": 1400,
                },
                {
                    "stage_name": "3. Cob Development & Grain Hardening (55–65 Days)",
                    "timing_days": "55–65 days",
                    "what_to_apply": "Foliar 0:52:34 (2 kg) + Liquid Chelate Zinc (250 ml) + 1 bag (45 kg) Urea",
                    "farmer_instructions": "Spray 100g 0:52:34 per 15L pump at 50% silking stage. Yield booster for 35+ quintals/acre.",
                    "estimated_cost_inr": 1600,
                },
            ],
        },
    },
    "paddy": {
        "crop_name": "Paddy / Rice",
        "low_budget": {
            "tier_label": "Low Budget / Semi-Organic",
            "cost_per_acre": 2400,
            "stages": [
                {
                    "stage_name": "1. Basal (At Puddling / Transplanting)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) Single Super Phosphate (SSP) + ½ bag (25 kg) Potash + Blue Green Algae (BGA)",
                    "farmer_instructions": "Broadcast into the standing puddled water just before final leveling.",
                    "estimated_cost_inr": 1400,
                },
                {
                    "stage_name": "2. Active Tillering (25–30 Days)",
                    "timing_days": "25–30 days",
                    "what_to_apply": "½ bag (22 kg) Neem-coated Urea",
                    "farmer_instructions": "Drain excess water to a thin film before broadcasting urea. Reflood after 24 hours.",
                    "estimated_cost_inr": 450,
                },
                {
                    "stage_name": "3. Panicle Initiation (50–55 Days)",
                    "timing_days": "50–55 days",
                    "what_to_apply": "½ bag (22 kg) Urea + Panchagavya spray",
                    "farmer_instructions": "Final top dressing for uniform earhead emergence and grain weight.",
                    "estimated_cost_inr": 550,
                },
            ],
        },
        "standard_budget": {
            "tier_label": "Standard Recommended (UAS Package of Practices)",
            "cost_per_acre": 4300,
            "stages": [
                {
                    "stage_name": "1. Basal (At Puddling / Transplanting)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) DAP + ½ bag (25 kg) MOP + 10 kg Zinc Sulphate (21%)",
                    "farmer_instructions": "Incorporate into soil during puddling. Essential for root establishment and cold tolerance.",
                    "estimated_cost_inr": 2550,
                },
                {
                    "stage_name": "2. Active Tillering Stage (25–30 Days)",
                    "timing_days": "25–30 days",
                    "what_to_apply": "1 bag (45 kg) Neem-coated Urea",
                    "farmer_instructions": "Maintain 2–3 cm standing water. Broadcast urea evenly in the morning.",
                    "estimated_cost_inr": 450,
                },
                {
                    "stage_name": "3. Panicle Emergence & Grain Filling (55–65 Days)",
                    "timing_days": "55–65 days",
                    "what_to_apply": "½ bag (25 kg) MOP (Potash) + 13:0:45 foliar spray (1 kg)",
                    "farmer_instructions": "Potash at panicle stage strengthens straw to prevent lodging and minimizes chaffy grains.",
                    "estimated_cost_inr": 1300,
                },
            ],
        },
        "high_budget": {
            "tier_label": "High-Yield Intensive Paddy Plan",
            "cost_per_acre": 6700,
            "stages": [
                {
                    "stage_name": "1. Basal Foundation (At Puddling)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1.5 bags (75 kg) 20:20:0:13 + 1 bag (50 kg) MOP + 10 kg Zinc + 5 kg Mycorrhiza",
                    "farmer_instructions": "Ensures massive root development in water-logged anaerobic paddy beds.",
                    "estimated_cost_inr": 3800,
                },
                {
                    "stage_name": "2. Maximum Tillering (25–30 Days)",
                    "timing_days": "25–30 days",
                    "what_to_apply": "1 bag (45 kg) Urea + Silicon nutrient granules (5 kg)",
                    "farmer_instructions": "Silicon deposits in leaf cuticle, repelling stem borers and fungal blast spores naturally.",
                    "estimated_cost_inr": 1300,
                },
                {
                    "stage_name": "3. Booting to Milk Stage (55–70 Days)",
                    "timing_days": "60–65 days",
                    "what_to_apply": "Foliar 0:52:34 (1.5 kg) + Boron (250 g) + ½ bag (25 kg) MOP",
                    "farmer_instructions": "Dissolve 80g 0:52:34 + 15g Boron per 15L spray tank. Guarantees 95%+ filled panicles.",
                    "estimated_cost_inr": 1600,
                },
            ],
        },
    },
    "tomato": {
        "crop_name": "Tomato",
        "low_budget": {
            "tier_label": "Low Budget / Semi-Organic Plan",
            "cost_per_acre": 3200,
            "stages": [
                {
                    "stage_name": "1. Basal (At Transplanting)",
                    "timing_days": "Day 0",
                    "what_to_apply": "2 tonnes FYM + 1 bag (50 kg) DAP + 1 bag Neem Cake (50 kg)",
                    "farmer_instructions": "Neem cake controls root-knot nematodes and slowly releases nitrogen. Apply in planting pits.",
                    "estimated_cost_inr": 2100,
                },
                {
                    "stage_name": "2. Vegetative Branching (25–30 Days)",
                    "timing_days": "25–30 days",
                    "what_to_apply": "1 bag (45 kg) Urea + Jeevamrutha foliar spray",
                    "farmer_instructions": "Ring placement 15 cm away from plant stem. Cover with soil and irrigate.",
                    "estimated_cost_inr": 550,
                },
                {
                    "stage_name": "3. Flowering & Fruit Setting (50–60 Days)",
                    "timing_days": "50–60 days",
                    "what_to_apply": "19:19:19 spray (1 kg) + Wood ash or bone meal dusting",
                    "farmer_instructions": "Mix 75g 19:19:19 per 15L spray pump. Spray once a week during active fruit setting.",
                    "estimated_cost_inr": 550,
                },
            ],
        },
        "standard_budget": {
            "tier_label": "Standard Recommended (UAS Horticulture Plan)",
            "cost_per_acre": 6200,
            "stages": [
                {
                    "stage_name": "1. Basal (At Transplanting)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1.5 bags (75 kg) DAP + 1 bag (50 kg) MOP + 10 kg Zinc Sulphate + 10 kg Micronutrient Grade-1",
                    "farmer_instructions": "Band-place 10 cm deep along bed lines before transplanting seedlings.",
                    "estimated_cost_inr": 3600,
                },
                {
                    "stage_name": "2. Early Vegetative & Staking (25–30 Days)",
                    "timing_days": "25–30 days",
                    "what_to_apply": "1 bag (45 kg) Urea + Calcium Nitrate (15 kg)",
                    "farmer_instructions": "Calcium is vital for tomatoes to prevent Blossom End Rot (black bottom fruits).",
                    "estimated_cost_inr": 1200,
                },
                {
                    "stage_name": "3. Peak Flowering & Fruit Sizing (50–70 Days)",
                    "timing_days": "50–70 days",
                    "what_to_apply": "0:52:34 (2 kg) + 13:0:45 (2 kg) + Boron (250 g)",
                    "farmer_instructions": "Foliar spray weekly: 75g 13:0:45 + 15g Boron per 15L pump. Improves fruit firmness and shelf life.",
                    "estimated_cost_inr": 1400,
                },
            ],
        },
        "high_budget": {
            "tier_label": "High-Yield Commercial Fertigation Schedule",
            "cost_per_acre": 9800,
            "stages": [
                {
                    "stage_name": "1. Soil Preparation & Basal Loading (Day 0)",
                    "timing_days": "Day 0",
                    "what_to_apply": "2 bags (100 kg) 12:32:16 + 1 bag (50 kg) Potash + 25 kg Calcium Nitrate + 10 kg Humic Acid",
                    "farmer_instructions": "Deep bed placement for hybrid determinate/indeterminate varieties targeting 30+ tonnes/acre.",
                    "estimated_cost_inr": 5200,
                },
                {
                    "stage_name": "2. Vegetative Canopy Drip Fertigation (20–40 Days)",
                    "timing_days": "Weekly split",
                    "what_to_apply": "Water-soluble 19:19:19 (25 kg over 3 weeks) + Magnesium Sulphate (10 kg)",
                    "farmer_instructions": "Apply through drip line twice a week (3–4 kg per fertigation cycle). Keeps foliage dark green.",
                    "estimated_cost_inr": 2300,
                },
                {
                    "stage_name": "3. Continuous Fruit Harvest & Sizing (50–90 Days)",
                    "timing_days": "Weekly split",
                    "what_to_apply": "0:52:34 (15 kg) + 0:0:50 (Potassium Sulphate, 15 kg) + Chelated Calcium-Boron",
                    "farmer_instructions": "Increases average fruit weight to 90–110 grams, prevents fruit cracking, and produces deep red color.",
                    "estimated_cost_inr": 2300,
                },
            ],
        },
    },
    "cotton": {
        "crop_name": "Cotton",
        "low_budget": {
            "tier_label": "Low Budget Plan",
            "cost_per_acre": 2800,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) DAP + 1 bag FYM",
                    "farmer_instructions": "Apply in dibbling holes before sowing hybrid Bt seeds.",
                    "estimated_cost_inr": 1600,
                },
                {
                    "stage_name": "2. Squaring Stage (35–40 Days)",
                    "timing_days": "35–40 days",
                    "what_to_apply": "1 bag (45 kg) Urea",
                    "farmer_instructions": "Ring placement around plants after inter-cultivation weeding.",
                    "estimated_cost_inr": 450,
                },
                {
                    "stage_name": "3. Flowering & Boll Formation (60–75 Days)",
                    "timing_days": "60–75 days",
                    "what_to_apply": "1 bag (45 kg) Urea + DAP 2% foliar spray",
                    "farmer_instructions": "Spray 300g DAP dissolved in 15L water to prevent square and young boll shedding.",
                    "estimated_cost_inr": 750,
                },
            ],
        },
        "standard_budget": {
            "tier_label": "Standard Recommended (UAS Dharwad Package of Practices)",
            "cost_per_acre": 5200,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1.5 bags (75 kg) DAP + 1 bag (50 kg) MOP + 10 kg Zinc Sulphate",
                    "farmer_instructions": "Essential for deep taproot penetration in black cotton soils.",
                    "estimated_cost_inr": 3400,
                },
                {
                    "stage_name": "2. Square Initiation & Branching (35–45 Days)",
                    "timing_days": "35–45 days",
                    "what_to_apply": "1 bag (45 kg) Urea + 10 kg Magnesium Sulphate",
                    "farmer_instructions": "Prevents 'reddening of cotton leaves' caused by magnesium deficiency in dry spells.",
                    "estimated_cost_inr": 850,
                },
                {
                    "stage_name": "3. Peak Boll Development (70–90 Days)",
                    "timing_days": "70–90 days",
                    "what_to_apply": "1 bag (45 kg) Urea + 13:0:45 foliar spray (2 kg) + Boron (250 g)",
                    "farmer_instructions": "Spray 75g 13:0:45 + 15g Boron per 15L pump. Directly increases boll size and lint weight.",
                    "estimated_cost_inr": 950,
                },
            ],
        },
        "high_budget": {
            "tier_label": "High-Yield Bt Hybrid Commercial Plan",
            "cost_per_acre": 7900,
            "stages": [
                {
                    "stage_name": "1. Basal Root Foundation (Day 0)",
                    "timing_days": "Day 0",
                    "what_to_apply": "2 bags (100 kg) 20:20:0:13 + 1.5 bags (75 kg) Potash + 10 kg Zinc + 10 kg Sulfur",
                    "farmer_instructions": "Deep furrow application to support heavy boll retention and strong vegetative frame.",
                    "estimated_cost_inr": 4800,
                },
                {
                    "stage_name": "2. Mid-Season Monopodial & Sympodial Growth (40 Days)",
                    "timing_days": "40 days",
                    "what_to_apply": "1.5 bags (68 kg) Urea + Humic Acid + 15 kg Magnesium Sulphate",
                    "farmer_instructions": "Top-dress before earthing up to prevent nutrient stress during heavy flower production.",
                    "estimated_cost_inr": 1500,
                },
                {
                    "stage_name": "3. Boll Swelling & Fiber Maturation (75–105 Days)",
                    "timing_days": "75–105 days",
                    "what_to_apply": "Foliar 0:52:34 (2 kg) + 0:0:50 (2 kg) + Planofix (Alpha NAA 4.5% SL, 50 ml)",
                    "farmer_instructions": "Spray 4 ml Planofix + 80g 0:0:50 per 15L pump. Completely stops boll drop and produces 12+ quintals/acre.",
                    "estimated_cost_inr": 1600,
                },
            ],
        },
    },
    "groundnut": {
        "crop_name": "Groundnut (Peanut)",
        "low_budget": {
            "tier_label": "Low Budget Plan",
            "cost_per_acre": 2200,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1 bag (50 kg) SSP + Rhizobium bio-fertilizer seed treatment",
                    "farmer_instructions": "Treat seeds with Rhizobium culture before sowing. Apply SSP in furrows.",
                    "estimated_cost_inr": 1200,
                },
                {
                    "stage_name": "2. Flowering & Pegging Initiation (30–35 Days)",
                    "timing_days": "30–35 days",
                    "what_to_apply": "1 bag (50 kg) Gypsum",
                    "farmer_instructions": "Crucial: Apply Gypsum around plants and hoe into soil. Calcium is mandatory for pod filling.",
                    "estimated_cost_inr": 450,
                },
                {
                    "stage_name": "3. Pod Filling (55–60 Days)",
                    "timing_days": "55–60 days",
                    "what_to_apply": "½ bag (22 kg) Urea + Micronutrient spray",
                    "farmer_instructions": "Light nitrogen top-dressing to maintain photosynthesis during pod development.",
                    "estimated_cost_inr": 550,
                },
            ],
        },
        "standard_budget": {
            "tier_label": "Standard Recommended (UAS Package of Practices)",
            "cost_per_acre": 4100,
            "stages": [
                {
                    "stage_name": "1. Basal (At Sowing)",
                    "timing_days": "Day 0",
                    "what_to_apply": "½ bag (25 kg) Urea + 1 bag (50 kg) DAP + ½ bag (25 kg) Potash + 10 kg Zinc",
                    "farmer_instructions": "Broadcast and incorporate into light sandy loam soils before sowing.",
                    "estimated_cost_inr": 2300,
                },
                {
                    "stage_name": "2. Pegging & Pod Initiation (30–40 Days)",
                    "timing_days": "35–40 days",
                    "what_to_apply": "2 bags (100 kg) Agricultural Gypsum + 1 kg Borax",
                    "farmer_instructions": "Apply gypsum along crop rows during weeding and earth up. Eliminates hollow pods ('pops').",
                    "estimated_cost_inr": 950,
                },
                {
                    "stage_name": "3. Pod Maturation (60–70 Days)",
                    "timing_days": "60–70 days",
                    "what_to_apply": "19:19:19 foliar spray (1 kg) + 0.5% Ferrous Sulphate (if leaves turn white/yellow)",
                    "farmer_instructions": "Dissolve 75g 19:19:19 per 15L pump. Spray in morning to maximize oil accumulation.",
                    "estimated_cost_inr": 850,
                },
            ],
        },
        "high_budget": {
            "tier_label": "High-Yield Commercial Oilseed Plan",
            "cost_per_acre": 5900,
            "stages": [
                {
                    "stage_name": "1. Basal Mineral Enrichment (Day 0)",
                    "timing_days": "Day 0",
                    "what_to_apply": "1.5 bags (75 kg) 20:20:0:13 + 1 bag (50 kg) Potash + 10 kg Zinc + VAM (Mycorrhiza)",
                    "farmer_instructions": "Mycorrhiza drastically boosts phosphorus uptake in low-fertility red sandy soils.",
                    "estimated_cost_inr": 3400,
                },
                {
                    "stage_name": "2. Peg Penetration Stage (35 Days)",
                    "timing_days": "35 days",
                    "what_to_apply": "3 bags (150 kg) Gypsum + 2 kg Boron",
                    "farmer_instructions": "Broadcasting gypsum into the pegging zone ensures 98%+ kernel recovery without empty shells.",
                    "estimated_cost_inr": 1300,
                },
                {
                    "stage_name": "3. Kernel Weight & Oil Accretion (65 Days)",
                    "timing_days": "65 days",
                    "what_to_apply": "Foliar 0:52:34 (1.5 kg) + Chelate Iron (250 g) + Humic acid spray",
                    "farmer_instructions": "Spray 80g 0:52:34 per 15L spray tank. Guarantees 18–22 quintals/acre yield.",
                    "estimated_cost_inr": 1200,
                },
            ],
        },
    },
}

# General fallback for crops without distinct schedule
GENERAL_CROP_SCHEDULE = CROP_FERTILIZER_DATABASE["ragi"]


# ---------------------------------------------------------------------------
# Public Recommendation API
# ---------------------------------------------------------------------------
class StageRecommendation(BaseModel):
    stage_name: str
    timing_days: str
    what_to_apply: str
    farmer_instructions: str
    estimated_cost_inr: float


class FertilizerRecommendationResponse(BaseModel):
    crop: str
    district: str
    soil_type: str
    soil_ph: float
    budget_tier: str
    acres: float
    total_estimated_cost_inr: float
    cost_per_acre_inr: float
    regional_soil_advisory: str
    deficiencies: list[str]
    stages: list[StageRecommendation]
    pesticide_spray: Optional[dict] = None
    water_tip: str


def get_fertilizer_recommendation(
    crop: str,
    district: str = "Mandya",
    budget_tier: str = "standard",
    acres: float = 1.0,
    disease_detected: Optional[str] = None,
) -> FertilizerRecommendationResponse:
    """
    Generate customized, farmer-friendly fertilizer & spray schedule.
    """
    clean_district = district.strip().lower()
    soil_info = DISTRICT_SOIL_DATA.get(clean_district, DEFAULT_SOIL_DATA)

    # Match crop in database
    clean_crop = crop.strip().lower()
    matched_data = None
    for key, data in CROP_FERTILIZER_DATABASE.items():
        if key in clean_crop or clean_crop in key:
            matched_data = data
            break

    if not matched_data:
        matched_data = GENERAL_CROP_SCHEDULE

    # Match budget tier: low, standard, high
    clean_tier = budget_tier.strip().lower()
    if "low" in clean_tier or "organic" in clean_tier:
        tier_key = "low_budget"
        tier_name = "Low Budget"
    elif "high" in clean_tier or "commercial" in clean_tier:
        tier_key = "high_budget"
        tier_name = "High-Yield Commercial"
    else:
        tier_key = "standard_budget"
        tier_name = "Standard Recommended"

    tier_data = matched_data.get(tier_key, matched_data["standard_budget"])

    # Calculate stages and scale costs by acres
    safe_acres = max(0.25, float(acres))
    base_cost_per_acre = float(tier_data["cost_per_acre"])
    total_cost = round(base_cost_per_acre * safe_acres, 0)

    stages_output: list[StageRecommendation] = []
    for s in tier_data["stages"]:
        # If acres > 1, clarify scaled quantities in farmer instructions
        instructions = s["farmer_instructions"]
        if safe_acres != 1.0:
            instructions += f" (Note: Multiply doses by {safe_acres:.1f} for your {safe_acres:.1f} acre farm)."

        stages_output.append(
            StageRecommendation(
                stage_name=s["stage_name"],
                timing_days=s["timing_days"],
                what_to_apply=s["what_to_apply"],
                farmer_instructions=instructions,
                estimated_cost_inr=round(s["estimated_cost_inr"] * safe_acres, 0),
            )
        )

    # Attach disease curative spray if detected or requested
    pesticide_info = None
    if disease_detected and disease_detected.lower() != "healthy":
        from app.services.disease_service import TREATMENT_DATABASE
        cond_lower = disease_detected.lower()
        for key, treat in TREATMENT_DATABASE.items():
            if key.lower() in cond_lower or any(w in cond_lower for w in key.lower().split()):
                pesticide_info = {
                    "disease": disease_detected,
                    "chemical_spray": treat.get("chemical"),
                    "tank_mixing_dose": treat.get("spray_dosage"),
                    "organic_option": treat.get("organic"),
                    "field_sanitation": treat.get("management"),
                }
                break

    # Location-tailored water advice
    water_tip = (
        f"In {district}'s {soil_info['soil_type']}, ensure good soil moisture before top-dressing urea. "
        "Do not apply granular fertilizers directly before expected heavy rainfall to avoid leaching."
    )

    return FertilizerRecommendationResponse(
        crop=matched_data["crop_name"],
        district=district.title(),
        soil_type=soil_info["soil_type"],
        soil_ph=soil_info["ph"],
        budget_tier=tier_name,
        acres=safe_acres,
        total_estimated_cost_inr=total_cost,
        cost_per_acre_inr=base_cost_per_acre,
        regional_soil_advisory=soil_info["advisory"],
        deficiencies=soil_info.get("deficiencies", ["Nitrogen", "Zinc"]),
        stages=stages_output,
        pesticide_spray=pesticide_info,
        water_tip=water_tip,
    )

