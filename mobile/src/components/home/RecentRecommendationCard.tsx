import { Text, View } from "react-native";
import { Card, Chip } from "@/components/ui";
import type { RecommendationResult } from "@/types/api";

type Props = {
  recommendation: RecommendationResult;
  dateLabel?: string;
  planTitle?: string;
};

export function RecentRecommendationCard({
  recommendation,
  dateLabel,
  planTitle,
}: Props) {
  // Build a short crop summary from recommendations list
  const cropSummary = recommendation.recommendations.length
    ? recommendation.recommendations
        .map(
          (c) =>
            `${c.crop.charAt(0).toUpperCase() + c.crop.slice(1)} ${c.area_acres.toFixed(1)} ac`
        )
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

  // Filter out obsolete "not trained" notices
  const visibleWarnings = recommendation.warnings.filter(
    (w) =>
      !w.toLowerCase().includes("yield model") &&
      !w.toLowerCase().includes("not been trained") &&
      !w.toLowerCase().includes("mandi_prices.csv is missing")
  );

  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
            {dateLabel ? `Recent recommendation · ${dateLabel}` : "Recent recommendation"}
          </Text>
        </View>
        <Chip
          label={recommendation.status === "ok" ? "Active" : "Optimized"}
          tone={recommendation.status === "ok" ? "success" : "default"}
        />
      </View>

      <Text className="font-sans-bold text-base text-forest">{cropSummary}</Text>

      {planTitle && (
        <Text className="mt-0.5 text-xs font-sans-medium text-ink-muted" numberOfLines={1}>
          {planTitle}
        </Text>
      )}

      {hasProfitRange ? (
        <Text className="mt-1 text-xs text-ink-muted">
          Est. profit ₹{(lower / 100000).toFixed(1)}L–₹{(upper / 100000).toFixed(1)}L ·{" "}
          {recommendation.location}
        </Text>
      ) : (
        <Text className="mt-1 text-xs text-ink-muted">
          {recommendation.location} · {recommendation.season} · ML Models Active
        </Text>
      )}

      {visibleWarnings.length > 0 && (
        <Text className="mt-1 text-[11px] italic text-warning">
          ⚠ {visibleWarnings[0]}
        </Text>
      )}
    </Card>
  );
}
