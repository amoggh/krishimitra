import { Text, View } from "react-native";
import { Card, Chip } from "@/components/ui";
import type { RecommendationResult } from "@/types/api";

type Props = { recommendation: RecommendationResult };

export function RecentRecommendationCard({ recommendation }: Props) {
  // Build a short crop summary from recommendations list
  const cropSummary = recommendation.recommendations.length
    ? recommendation.recommendations
        .map((c) => `${c.crop.charAt(0).toUpperCase() + c.crop.slice(1)} ${c.area_acres.toFixed(1)} ac`)
        .join(" · ")
    : "No crops allocated yet";

  // Aggregate profit range if available
  const lower = recommendation.recommendations
    .map((c) => c.net_profit_lower_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const upper = recommendation.recommendations
    .map((c) => c.net_profit_upper_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const hasProfitRange = lower > 0 || upper > 0;

  const modelsReady =
    recommendation.data_quality.yield_model_trained &&
    recommendation.data_quality.price_model_trained;

  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
          Recent recommendation
        </Text>
        <Chip
          label={recommendation.status === "ok" ? "Active" : "Partial"}
          tone={recommendation.status === "ok" ? "success" : "warning"}
        />
      </View>

      <Text className="font-sans-bold text-base text-forest">{cropSummary}</Text>

      {hasProfitRange ? (
        <Text className="text-xs text-ink-muted">
          Est. profit ₹{(lower / 100000).toFixed(1)}L–₹{(upper / 100000).toFixed(1)}L ·{" "}
          {recommendation.location}
        </Text>
      ) : (
        <Text className="text-xs text-ink-muted">
          {recommendation.location} · {recommendation.season} ·{" "}
          {modelsReady ? "Models ready" : "Awaiting training data"}
        </Text>
      )}

      {recommendation.warnings.length > 0 && (
        <Text className="mt-1 text-[11px] italic text-warning">
          ⚠ {recommendation.warnings[0]}
        </Text>
      )}
    </Card>
  );
}
