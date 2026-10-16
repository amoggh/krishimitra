from fastapi import APIRouter

from app.models.schemas import RiskAnalysis
from app.services.mock_engine import get_risk

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/{plan_id}", response_model=RiskAnalysis)
def risk_analysis(plan_id: str) -> RiskAnalysis:
    from app.api.v1.crop_optimizer import ACTIVE_PLANS

    key = plan_id.strip().lower()
    plan = ACTIVE_PLANS.get(key) or ACTIVE_PLANS.get("latest")

    if plan and plan.recommendations:
        crops = plan.recommendations
        total_acres = sum(c.area_acres for c in crops) or 1.0

        # Weighted yield failure probability
        weighted_yield_fail = sum(
            c.area_acres * (c.risk_result.yield_failure_probability if c.risk_result and c.risk_result.yield_failure_probability is not None else 0.12)
            for c in crops
        ) / total_acres
        rainfall_risk_pct = round(weighted_yield_fail * 100, 1)

        # Weighted price crash probability
        weighted_price_crash = sum(
            c.area_acres * (c.risk_result.price_crash_probability if c.risk_result and c.risk_result.price_crash_probability is not None else 0.15)
            for c in crops
        ) / total_acres
        price_volatility_pct = round(weighted_price_crash * 100, 1)

        # Diversification bonus
        div_bonus = 12 if len(crops) >= 2 else 0
        overall = int(max(15, min(85, (rainfall_risk_pct * 0.4) + (price_volatility_pct * 0.4) + 20 - div_bonus)))

        # Context-aware pest risk
        crop_names = " ".join(c.crop.lower() for c in crops)
        if "cotton" in crop_names or "groundnut" in crop_names:
            pest = "Moderate (watch for bollworm/leaf miner)"
        else:
            pest = "Low (standard IPM recommended)"

        distribution = [
            {"x": 0, "y": 0.10},
            {"x": 1, "y": 0.28},
            {"x": 2, "y": 0.62},
            {"x": 3, "y": 0.92},
            {"x": 4, "y": 0.72},
            {"x": 5, "y": 0.32},
        ]

        return RiskAnalysis(
            overall_score=overall,
            rainfall_risk_pct=rainfall_risk_pct,
            price_volatility_pct=price_volatility_pct,
            pest_risk=pest,
            profit_distribution=distribution,
        )

    return get_risk(plan_id)
