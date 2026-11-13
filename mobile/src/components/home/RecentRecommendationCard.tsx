import React from "react";
import { Text, View } from "react-native";
import { Sprout, ChevronRight, AlertTriangle, TrendingUp } from "lucide-react-native";
import { Card, Badge } from "@/components/ui";
import { colors } from "@/theme/tokens";
import type { RecommendationResult } from "@/types/api";

type Props = {
  recommendation: RecommendationResult;
  dateLabel?: string;
  planTitle?: string;
  isCurrent?: boolean;
};

export function RecentRecommendationCard({
  recommendation,
  dateLabel,
  planTitle,
  isCurrent = true,
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

  const headerTitle = isCurrent
    ? dateLabel
      ? `Current Recommendation · ${dateLabel}`
      : "Current Recommendation"
    : dateLabel
    ? `Recent Plan · ${dateLabel}`
    : "Farm Recommendation";

  return (
    <Card className="mb-3.5 border border-[#183B2B]/[0.08]">
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Sprout size={14} color={colors.primary} />
          <Text className="font-sans-bold text-[11px] uppercase tracking-wider text-primary">
            {headerTitle}
          </Text>
        </View>
        <Badge
          label={isCurrent ? "Active Plan" : recommendation.status === "ok" ? "Optimized" : "Draft"}
          tone={isCurrent ? "success" : "neutral"}
          dot
          size="sm"
        />
      </View>

      <Text className="font-sans-extrabold text-base text-ink tracking-tight">
        {cropSummary}
      </Text>

      {planTitle && (
        <Text className="mt-0.5 font-sans-medium text-xs text-ink-muted" numberOfLines={1}>
          {planTitle}
        </Text>
      )}

      {hasProfitRange ? (
        <View className="mt-2 flex-row items-center gap-1.5 rounded-lg bg-sage/60 px-2.5 py-1.5">
          <TrendingUp size={13} color={colors.primary} />
          <Text className="font-sans text-xs text-primary">
            Est. profit <Text className="font-sans-bold text-primary">₹{(lower / 100000).toFixed(1)}L–₹{(upper / 100000).toFixed(1)}L</Text> · {recommendation.location}
          </Text>
        </View>
      ) : (
        <Text className="mt-1 font-sans text-xs text-ink-muted">
          {recommendation.location} · {recommendation.season} · ML Models Active
        </Text>
      )}

      {visibleWarnings.length > 0 && (
        <View className="mt-2 flex-row items-center gap-1.5">
          <AlertTriangle size={12} color={colors.warning} />
          <Text className="font-sans text-[11px] text-warning" numberOfLines={1}>
            {visibleWarnings[0]}
          </Text>
        </View>
      )}

      <View className="mt-3 flex-row items-center justify-end gap-0.5 pt-2 border-t border-cream-muted/50">
        <Text className="font-sans-bold text-xs text-primary">View Full Plan</Text>
        <ChevronRight size={14} color={colors.primary} />
      </View>
    </Card>
  );
}

export default RecentRecommendationCard;
