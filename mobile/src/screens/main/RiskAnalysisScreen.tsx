import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { RootStackScreenProps } from "@/types/navigation";
import {
  BackButton,
  Card,
  GradientHeader,
  PrimaryButton,
  ScreenContainer,
  SectionTitle,
} from "@/components/ui";
import { RiskMeter, RiskMeterLabel } from "@/components/risk/RiskMeter";
import { MonteCarloChart } from "@/components/charts/MonteCarloChart";
import { getRiskAnalysis } from "@/services/api";
import { mockRecommendation, mockRisk } from "@/data/mockData";
import type { RecommendationResult, RiskAnalysis } from "@/types/api";
import { colors } from "@/theme/colors";

type Props = RootStackScreenProps<"RiskAnalysis">;

export function RiskAnalysisScreen({ navigation, route }: Props) {
  // If result was passed directly from RecommendationsScreen, use it!
  const activePlan: RecommendationResult =
    route.params?.result ?? mockRecommendation;

  const [backendRisk, setBackendRisk] = useState<RiskAnalysis | null>(null);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);

  useEffect(() => {
    const planId =
      route.params?.planId ||
      `${activePlan.location.toLowerCase()}-${activePlan.season.toLowerCase()}`;
    getRiskAnalysis(planId)
      .then(setBackendRisk)
      .catch(() => setBackendRisk(null));
  }, [route.params?.planId, activePlan.location, activePlan.season]);

  // Dynamically compute real risk analytics from the optimized plan
  const riskData = useMemo(() => {
    const crops = activePlan.recommendations || [];
    const totalAcres =
      activePlan.total_land_acres ||
      crops.reduce((sum, c) => sum + c.area_acres, 0) ||
      1;

    // 1. Summary string of recommended crops
    const cropsSummary = crops.length
      ? crops.map((c) => `${c.crop} (${c.area_acres.toFixed(1)} ac)`).join(" + ")
      : "Optimized Crop Plan";

    // 2. Weighted yield failure probability
    const weightedYieldFail = crops.reduce((sum, c) => {
      const prob = c.risk_result?.yield_failure_probability ?? 0.12;
      return sum + (c.area_acres / totalAcres) * prob;
    }, 0);
    const rainfallRiskPct =
      backendRisk?.rainfall_risk_pct ?? Math.round(weightedYieldFail * 100);

    // 3. Weighted price crash / volatility probability
    const weightedPriceCrash = crops.reduce((sum, c) => {
      const prob = c.risk_result?.price_crash_probability ?? 0.14;
      return sum + (c.area_acres / totalAcres) * prob;
    }, 0);
    const priceVolatilityPct =
      backendRisk?.price_volatility_pct ?? Math.round(weightedPriceCrash * 100);

    // 4. Water stress factor
    const totalWaterReq =
      crops.reduce(
        (sum, c) => sum + (c.water_requirement_mm ?? 500) * c.area_acres,
        0
      ) / totalAcres;
    const availableWater =
      activePlan.water_budget?.total_available_mm_mid || 600;
    const waterRatio = totalWaterReq / availableWater;
    const waterRiskScore = Math.min(
      45,
      Math.max(10, Math.round(waterRatio * 25))
    );

    // 5. Diversification adjustment
    const diversificationBonus =
      crops.length >= 3 ? 15 : crops.length === 2 ? 10 : -10;

    // 6. Overall risk score (0–100)
    const computedScore = Math.round(
      rainfallRiskPct * 0.4 +
        priceVolatilityPct * 0.4 +
        waterRiskScore * 0.2 -
        diversificationBonus
    );
    const overallScore =
      backendRisk?.overall_score ?? Math.max(15, Math.min(85, computedScore));

    // 7. Overall score rating and color
    let scoreLabel = "Moderate Risk — Balanced return & volatility";
    let scoreColor: string = colors.warning;
    if (overallScore < 35) {
      scoreLabel = "Low Risk — Diversified allocation protects capital";
      scoreColor = colors.success;
    } else if (overallScore > 60) {
      scoreLabel = "Elevated Risk — Insurance recommended against dry spells";
      scoreColor = colors.danger;
    }

    // 8. Aggregate profit bounds
    const profitLower = crops.reduce(
      (sum, c) =>
        sum +
        (c.net_profit_lower_inr ??
          c.risk_result?.profit_p10_inr ??
          (c.expected_net_profit_inr || 40000) * 0.75),
      0
    );
    const profitUpper = crops.reduce(
      (sum, c) =>
        sum +
        (c.net_profit_upper_inr ??
          c.risk_result?.profit_p90_inr ??
          (c.expected_net_profit_inr || 40000) * 1.25),
      0
    );
    const profitExpected = crops.reduce(
      (sum, c) =>
        sum +
        (c.expected_net_profit_inr ?? (profitLower + profitUpper) / 2),
      0
    );

    // 9. Monte Carlo distribution
    const profitDistribution = backendRisk?.profit_distribution || [
      { x: 0, y: 0.1 },
      { x: 1, y: 0.28 },
      { x: 2, y: 0.65 },
      { x: 3, y: 0.95 },
      { x: 4, y: 0.75 },
      { x: 5, y: 0.35 },
      { x: 6, y: 0.12 },
    ];

    // 10. Specific pest risk analysis
    const cropNames = crops.map((c) => c.crop.toLowerCase()).join(" ");
    const pestPoints: string[] = [];
    if (cropNames.includes("cotton")) {
      pestPoints.push("Cotton: monitor for pink bollworm during flowering.");
    }
    if (cropNames.includes("maize")) {
      pestPoints.push("Maize: scout for Fall Armyworm in vegetative phase.");
    }
    if (cropNames.includes("ragi") || cropNames.includes("millet")) {
      pestPoints.push("Ragi: natural resistance against major Karnataka pests.");
    }
    if (cropNames.includes("groundnut")) {
      pestPoints.push("Groundnut: watch for tikka leaf spot in humid spells.");
    }
    if (cropNames.includes("soybean") || cropNames.includes("soyabean")) {
      pestPoints.push("Soybean: maintain weed control during first 30 days.");
    }

    const pestDescription = pestPoints.length
      ? pestPoints.join(" ")
      : `Standard Integrated Pest Management (IPM) for ${activePlan.location}.`;

    return {
      cropsSummary,
      overallScore,
      scoreLabel,
      scoreColor,
      rainfallRiskPct,
      priceVolatilityPct,
      pestDescription,
      profitLower,
      profitUpper,
      profitExpected,
      profitDistribution,
      totalWaterReq: Math.round(totalWaterReq),
      availableWater: Math.round(availableWater),
      waterRatio,
    };
  }, [activePlan, backendRisk]);

  const seasonLabel =
    activePlan.season.charAt(0).toUpperCase() + activePlan.season.slice(1);

  return (
    <View className="flex-1 bg-cream">
      {/* ── Dynamic Gradient Header ── */}
      <GradientHeader>
        <BackButton light className="mb-2.5" fallbackRoute="Recommendations" />
        <Text className="font-sans-extrabold text-xl text-white">
          Risk analysis
        </Text>
        <Text className="text-xs text-white/90" numberOfLines={1}>
          {riskData.cropsSummary}
        </Text>
        <Text className="text-[11px] text-white/75">
          {activePlan.location} · {seasonLabel} · {activePlan.total_land_acres} acres
        </Text>
      </GradientHeader>

      <ScreenContainer safe={false} className="px-4">
        {/* ── Overall Risk Meter Card ── */}
        <Card className="items-center">
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
            Plan risk score
          </Text>
          <Text
            className="font-sans-extrabold text-4xl"
            style={{ color: riskData.scoreColor }}
          >
            {riskData.overallScore}
            <Text className="text-base text-ink-muted">/100</Text>
          </Text>
          <Text className="mt-1 text-center text-xs text-ink-muted">
            {riskData.scoreLabel}
          </Text>
          <View className="mt-2 w-full">
            <RiskMeter
              score={riskData.overallScore}
              color={riskData.scoreColor}
            />
          </View>
        </Card>

        {/* ── Per-Crop Risk & Yield Breakdown ── */}
        <SectionTitle>Allocated crop risk breakdown</SectionTitle>
        {activePlan.recommendations.map((c) => {
          const failProb = Math.round(
            (c.risk_result?.yield_failure_probability ?? 0.12) * 100
          );
          const crashProb = Math.round(
            (c.risk_result?.price_crash_probability ?? 0.14) * 100
          );
          const netMin = c.net_profit_lower_inr ?? c.risk_result?.profit_p10_inr;
          const netMax = c.net_profit_upper_inr ?? c.risk_result?.profit_p90_inr;

          return (
            <Card key={c.crop} className="mb-2.5">
              <View className="flex-row items-center justify-between pb-1.5 border-b border-cream-dark/50">
                <View>
                  <Text className="font-sans-bold text-base text-ink">
                    {c.crop}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    {c.area_acres.toFixed(1)} acres ({c.percentage_of_total.toFixed(0)}% of land)
                  </Text>
                </View>
                <View className="items-end">
                  {c.expected_net_profit_inr ? (
                    <Text className="font-sans-bold text-sm text-forest">
                      ₹{(c.expected_net_profit_inr / 1000).toFixed(0)}k net
                    </Text>
                  ) : null}
                  {netMin && netMax ? (
                    <Text className="text-[10px] text-ink-light">
                      Range: ₹{(netMin / 1000).toFixed(0)}k–{(netMax / 1000).toFixed(0)}k
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="mt-2 flex-row gap-2">
                <View className="flex-1 rounded-lg bg-cream/70 p-2">
                  <Text className="text-[10px] text-ink-light uppercase">Yield risk</Text>
                  <Text className="font-sans-bold text-xs text-ink">
                    {failProb}% failure odds
                  </Text>
                </View>
                <View className="flex-1 rounded-lg bg-cream/70 p-2">
                  <Text className="text-[10px] text-ink-light uppercase">Price crash</Text>
                  <Text className="font-sans-bold text-xs text-ink">
                    {crashProb}% crash odds
                  </Text>
                </View>
                <View className="flex-1 rounded-lg bg-cream/70 p-2">
                  <Text className="text-[10px] text-ink-light uppercase">Water need</Text>
                  <Text className="font-sans-bold text-xs text-ink">
                    {c.water_requirement_mm ? `${c.water_requirement_mm} mm` : "Normal"}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}

        {/* ── Rainfall & Water Budget Risk ── */}
        <SectionTitle>Agro-climatic factors</SectionTitle>
        <Card>
          <RiskMeterLabel
            label="Rainfall & Drought Risk"
            value={`${riskData.rainfallRiskPct}% bad season`}
          />
          <Text className="mb-2 text-xs text-ink-muted leading-4">
            Yield below 60% expected in {riskData.rainfallRiskPct}% of simulated rainfall scenarios in {activePlan.location}.
            Seasonal crop water demand ({riskData.totalWaterReq} mm) is{" "}
            {riskData.waterRatio <= 1
              ? `fully covered by your available water budget (${riskData.availableWater} mm).`
              : `close to your estimated water supply (${riskData.availableWater} mm).`}
          </Text>
          <RiskMeter score={riskData.rainfallRiskPct} color={riskData.scoreColor} />
        </Card>

        {/* ── Price Volatility Risk ── */}
        <Card>
          <RiskMeterLabel
            label="Market Price Volatility"
            value={`${riskData.priceVolatilityPct}% crash risk`}
          />
          <Text className="mb-2 text-xs text-ink-muted leading-4">
            {activePlan.recommendations.length >= 2
              ? `Diversifying across ${activePlan.recommendations.length} crops shields your total earnings: a price slump in one crop is balanced by the other.`
              : "Single crop allocation is directly exposed to mandi price swings at harvest time."}
          </Text>
          <RiskMeter
            score={riskData.priceVolatilityPct}
            color={riskData.priceVolatilityPct > 20 ? colors.danger : colors.warning}
          />
        </Card>

        {/* ── Pest Risk Card ── */}
        <Card>
          <RiskMeterLabel
            label="Pest & Disease Advisory"
            value={riskData.overallScore < 40 ? "Low" : "Moderate"}
          />
          <Text className="text-xs text-ink-muted leading-4">
            {riskData.pestDescription}
          </Text>
        </Card>

        {/* ── Monte Carlo Profit Simulation ── */}
        <Card>
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
            Monte Carlo Simulation · 10,000 Scenarios
          </Text>
          <MonteCarloChart data={riskData.profitDistribution} />
          <View className="mt-2 flex-row justify-between border-t border-cream-dark/40 pt-2">
            <View>
              <Text className="text-[10px] text-ink-light uppercase">Conservative (P10)</Text>
              <Text className="font-sans-bold text-xs text-ink">
                ₹{(riskData.profitLower / 100000).toFixed(1)} Lakhs
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] text-ink-light uppercase">Expected Profit</Text>
              <Text className="font-sans-bold text-xs text-forest">
                ₹{(riskData.profitExpected / 100000).toFixed(1)} Lakhs
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-ink-light uppercase">Optimistic (P90)</Text>
              <Text className="font-sans-bold text-xs text-ink">
                ₹{(riskData.profitUpper / 100000).toFixed(1)} Lakhs
              </Text>
            </View>
          </View>
        </Card>

        {/* ── PMFBY Suggestion Button ── */}
        <PrimaryButton
          label="View PMFBY insurance suggestion"
          variant="outline"
          onPress={() => setShowInsuranceModal(true)}
        />

        {/* ── Back to plan ── */}
        <Pressable
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("Main")
          }
          className="mt-3 py-2"
        >
          <Text className="text-center font-sans-semibold text-sm text-forest">
            ← Back to plan
          </Text>
        </Pressable>
      </ScreenContainer>

      {/* ── PMFBY Insurance Info Modal ── */}
      <Modal
        visible={showInsuranceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInsuranceModal(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-4"
          onPress={() => setShowInsuranceModal(false)}
        >
          <Pressable
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-3 flex-row items-center justify-between border-b border-cream-dark pb-3">
              <Text className="font-sans-bold text-lg text-ink">
                PMFBY Crop Insurance
              </Text>
              <Pressable
                onPress={() => setShowInsuranceModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-cream"
              >
                <Text className="font-sans-bold text-sm text-ink-muted">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-96">
              <Text className="mb-2 text-xs text-ink-muted">
                Pradhan Mantri Fasal Bima Yojana (PMFBY) subsidized rates for your {seasonLabel} crops in {activePlan.location}:
              </Text>

              {activePlan.recommendations.map((c) => {
                const isFoodGrain = ["Maize", "Ragi / Finger Millet", "Rice / Paddy", "Jowar / Sorghum", "Wheat"].includes(c.crop);
                const premiumPct = activePlan.season.toLowerCase() === "rabi" ? (isFoodGrain ? "1.5%" : "5.0%") : (isFoodGrain ? "2.0%" : "5.0%");

                return (
                  <View
                    key={c.crop}
                    className="mb-2 rounded-xl border border-cream-dark bg-cream/30 p-3"
                  >
                    <Text className="font-sans-bold text-sm text-ink">
                      {c.crop} ({c.area_acres.toFixed(1)} acres)
                    </Text>
                    <Text className="text-xs text-ink-muted mt-0.5">
                      Farmer Premium Share: <Text className="font-sans-bold text-forest">{premiumPct}</Text> of sum insured
                    </Text>
                    <Text className="text-[11px] text-ink-light mt-1">
                      Covers drought, flood, localized post-harvest loss, and pest outbreaks.
                    </Text>
                  </View>
                );
              })}

              <Text className="mt-2 text-xs text-ink-muted leading-4">
                ℹ Apply via CSC Centers, your bank branch, or the official portal:
                {"\n"}
                <Text className="font-sans-semibold text-forest">pmfby.gov.in</Text>
              </Text>
            </ScrollView>

            <View className="mt-4">
              <PrimaryButton
                label="Close"
                onPress={() => setShowInsuranceModal(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
