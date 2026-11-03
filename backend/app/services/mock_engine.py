"""Placeholder responses until ML pipeline is wired."""

from app.models.schemas import (
    CropRecommendation,
    LandDivision,
    MandiPrice,
    ProfitRange,
    RecommendationResult,
    RiskAnalysis,
)


def get_dashboard() -> dict:
    return {
        "farmer": {
            "id": "1",
            "name": "Ramesh Patil",
            "phone": "+919876543210",
            "location": "Mandya, Karnataka",
            "acres": 5.0,
        },
        "weather": {
            "location": "Mandya",
            "temp_c": 30,
            "condition": "Partly cloudy",
            "rain_chance_pct": 45,
        },
        "soil": {"type": "Red Loam", "ph": 6.5, "npk": "moderate"},
        "water_budget_litres_per_acre": 16500,
        "market_trends": get_mandi_prices("Mandya"),
    }


def get_recommendation(job_id: str) -> RecommendationResult:
    return RecommendationResult(
        plan_id=job_id,
        season="Kharif 2026",
        profit_inr=ProfitRange(low=180000, high=240000),
        confidence_pct=87,
        land_division=[
            LandDivision(crop="Soybean", acres=2.5, color="#2d8a57"),
            LandDivision(crop="Cotton", acres=2.0, color="#c4a35a"),
        ],
        crops=[
            CropRecommendation(
                crop="Soybean",
                acres=2.5,
                input_tier="Improved",
                yield_quintals_per_acre=ProfitRange(low=18, high=24),
                price_per_quintal=ProfitRange(low=4200, high=4800),
                profit_inr=ProfitRange(low=95000, high=120000),
                water_usage_pct=85,
                risk_level="low",
            ),
            CropRecommendation(
                crop="Cotton",
                acres=2.0,
                input_tier="Basic",
                yield_quintals_per_acre=ProfitRange(low=8, high=11),
                price_per_quintal=ProfitRange(low=6100, high=7200),
                profit_inr=ProfitRange(low=72000, high=98000),
                water_usage_pct=92,
                risk_level="medium",
            ),
        ],
        explanation=(
            "Soybean matches loam soil and drip irrigation. Cotton diversifies price risk. "
            "No crop exceeds 56% of land."
        ),
    )


def get_risk(plan_id: str) -> RiskAnalysis:
    return RiskAnalysis(
        overall_score=42,
        rainfall_risk_pct=28,
        price_volatility_pct=34,
        pest_risk="low",
        profit_distribution=[
            {"x": 0, "y": 0.1},
            {"x": 1, "y": 0.25},
            {"x": 2, "y": 0.45},
            {"x": 3, "y": 0.7},
            {"x": 4, "y": 0.85},
            {"x": 5, "y": 0.75},
        ],
    )


def get_mandi_prices(district: str | None) -> list[MandiPrice]:
    loc = district or "Mandya"
    return [
        MandiPrice(
            crop="Ragi",
            mandi=f"{loc} APMC",
            price_inr=3850,
            change_pct=3.2,
            updated_at="2h ago",
            trend_7d=[35, 36, 36, 37, 38, 38, 39],
        ),
        MandiPrice(
            crop="Maize",
            mandi=f"{loc} APMC",
            price_inr=2150,
            change_pct=-1.2,
            updated_at="2h ago",
            trend_7d=[23, 22, 22, 21, 21, 22, 22],
        ),
    ]
