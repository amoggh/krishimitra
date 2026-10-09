import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { RootStackScreenProps } from "@/types/navigation";
import {
  Card,
  PrimaryButton,
  ScreenContainer,
  SectionTitle,
} from "@/components/ui";
import { LandDivisionBar, toLandDivision } from "@/components/recommendations/LandDivisionBar";
import { CropRecommendationCard } from "@/components/recommendations/CropRecommendationCard";
import { colors } from "@/theme/colors";

type Props = RootStackScreenProps<"Recommendations">;

export function RecommendationsScreen({ navigation, route }: Props) {
  const { result } = route.params;

  const hasRecommendations = result.recommendations.length > 0;
  const division = toLandDivision(result.recommendations);

  // Aggregate profit display from risk_results (if available)
  const profitLower = result.recommendations
    .map((c) => c.net_profit_lower_inr ?? c.risk_result?.profit_p10_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const profitUpper = result.recommendations
    .map((c) => c.net_profit_upper_inr ?? c.risk_result?.profit_p90_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const hasProfitEstimate = profitLower > 0 || profitUpper > 0;

  // Data quality indicator
  const modelsReady =
    result.data_quality.yield_model_trained &&
    result.data_quality.price_model_trained;

  const seasonLabel =
    result.season.charAt(0).toUpperCase() + result.season.slice(1);

  return (
    <ScreenContainer>
      {/* ── Header banner ── */}
      <LinearGradient
        colors={[colors.forest, colors.green]}
        className="-mx-4 mb-4 rounded-b-3xl px-4 pb-5 pt-4"
      >
        <Text className="text-xs text-white/85">
          {result.location} · {seasonLabel} · Optimized plan
        </Text>

        {hasProfitEstimate ? (
          <>
            <Text className="font-sans-extrabold text-3xl text-white">
              ₹{(profitLower / 100000).toFixed(1)}L – ₹
              {(profitUpper / 100000).toFixed(1)}L
            </Text>
            <Text className="text-xs text-white/90">Estimated net profit range</Text>
          </>
        ) : (
          <>
            <Text className="font-sans-extrabold text-2xl text-white">
              {result.total_land_acres} acres · {result.recommendations.length} crops
            </Text>
            <Text className="text-xs text-white/75">
              Profit estimates available after model training
            </Text>
          </>
        )}

        {/* Confidence badge */}
        {result.confidence && (
          <View className="mt-2 flex-row items-center gap-2">
            <View
              className={`rounded-full px-2.5 py-0.5 ${
                result.confidence === "High"
                  ? "bg-emerald-600/40 border border-emerald-300"
                  : result.confidence === "Medium"
                  ? "bg-amber-500/40 border border-amber-300"
                  : "bg-red-500/40 border border-red-300"
              }`}
            >
              <Text className="text-[11px] font-sans-bold text-white">
                {result.confidence} Confidence
              </Text>
            </View>
            {result.confidence_explanation && (
              <Text className="flex-1 text-[10px] leading-3 text-white/80" numberOfLines={2}>
                {result.confidence_explanation}
              </Text>
            )}
          </View>
        )}

        {/* Data quality pills */}
        <View className="mt-3 flex-row gap-2">
          <DataPill label="Water ✓" active />
          <DataPill label="Compatibility ✓" active />
          <DataPill label="Yield model" active={result.data_quality.yield_model_trained} />
          <DataPill label="Price model" active={result.data_quality.price_model_trained} />
        </View>
      </LinearGradient>

      {/* ── Water budget card ── */}
      <Card className="mb-1">
        <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
          Water budget · Seasonal
        </Text>
        <View className="mt-1 flex-row gap-4">
          <View>
            <Text className="font-sans-extrabold text-base text-forest">
              {result.water_budget.total_available_mm_mid.toFixed(0)} mm
            </Text>
            <Text className="text-xs text-ink-muted">Total available</Text>
          </View>
          <View>
            <Text className="font-sans-extrabold text-base text-forest">
              {result.water_budget.effective_rainfall_mm.toFixed(0)} mm
            </Text>
            <Text className="text-xs text-ink-muted">Eff. rainfall</Text>
          </View>
          <View>
            <Text className="font-sans-extrabold text-base text-forest">
              {(result.water_budget.estimated_daily_litres_mid / 1000).toFixed(1)}K L/day
            </Text>
            <Text className="text-xs text-ink-muted">Pump output</Text>
          </View>
        </View>
      </Card>

      {/* ── Status / warnings ── */}
      {result.warnings.length > 0 && (
        <View className="mb-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <Text className="mb-1 font-sans-bold text-[11px] uppercase text-warning">
            Data status
          </Text>
          {result.warnings.slice(0, 3).map((w, i) => (
            <Text key={i} className="text-xs leading-5 text-ink-muted">
              • {w}
            </Text>
          ))}
        </View>
      )}

      {/* ── Land division ── */}
      {hasRecommendations && (
        <>
          <SectionTitle>Land division</SectionTitle>
          <LandDivisionBar division={division} />
        </>
      )}

      {/* ── Recommended crops ── */}
      {hasRecommendations ? (
        <>
          <SectionTitle>Recommended crops</SectionTitle>
          {result.recommendations.map((crop, i) => (
            <CropRecommendationCard
              key={crop.crop}
              crop={crop}
              accent={i === 0 ? "green" : "earth"}
            />
          ))}
        </>
      ) : (
        <Card className="items-center py-6">
          <Text className="font-sans-bold text-base text-ink-muted">
            No recommendations yet
          </Text>
          <Text className="mt-1 text-center text-xs text-ink-light">
            {result.message ??
              "Add crop data files to the data directory to enable recommendations."}
          </Text>
        </Card>
      )}

      {/* ── Why this plan ── */}
      {hasRecommendations && result.why_this_plan && result.why_this_plan.length > 0 && (
        <>
          <SectionTitle>Why this plan</SectionTitle>
          <Card className="mb-3">
            {result.why_this_plan.map((point, i) => (
              <View key={i} className="mb-2 flex-row gap-2">
                <Text className="text-xs text-forest">✓</Text>
                <Text className="flex-1 text-xs leading-5 text-ink">
                  {point}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* ── Rejected crops ── */}
      {result.rejected_crops.length > 0 && (
        <>
          <SectionTitle>Rejected crops</SectionTitle>
          <View className="mb-3 rounded-xl border border-cream-dark bg-white p-3">
            {result.rejected_crops.map((r) => (
              <View key={r.crop} className="mb-2">
                <Text className="font-sans-bold text-sm text-ink">
                  {r.crop.charAt(0).toUpperCase() + r.crop.slice(1)}
                </Text>
                {r.reasons.map((reason, i) => (
                  <Text key={i} className="text-xs leading-4 text-ink-muted">
                    • {reason}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Verified Data Sources ── */}
      {result.data_sources && result.data_sources.length > 0 && (
        <>
          <SectionTitle>Real data sources</SectionTitle>
          <Card className="mb-3 bg-cream-dark/20">
            <Text className="mb-1 text-[11px] font-sans-bold uppercase text-ink-light">
              Official datasets used
            </Text>
            {result.data_sources.map((source, i) => (
              <Text key={i} className="text-xs leading-5 text-ink-muted">
                • {source}
              </Text>
            ))}
          </Card>
        </>
      )}

      {/* ── Risk analysis link ── */}
      {hasRecommendations && (
        <Pressable
          onPress={() =>
            navigation.navigate("RiskAnalysis", {
              planId: `${result.location}-${result.season}`,
            })
          }
        >
          <Text className="mb-3 text-center font-sans-semibold text-sm text-forest">
            View risk analysis →
          </Text>
        </Pressable>
      )}

      <PrimaryButton
        label="Save & share plan"
        onPress={() => navigation.navigate("Main")}
      />
    </ScreenContainer>
  );
}

/** Small pill showing whether a feature is active or pending */
function DataPill({ label, active }: { label: string; active: boolean }) {
  return (
    <View
      className={`rounded-full px-2 py-0.5 ${
        active ? "bg-white/25" : "bg-white/10"
      }`}
    >
      <Text
        className={`text-[10px] font-sans-bold ${
          active ? "text-white" : "text-white/40"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
