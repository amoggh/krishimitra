import { Text, View } from "react-native";
import { Card, Chip } from "@/components/ui";
import type { RecommendationResult } from "@/types/api";

type Props = { recommendation: RecommendationResult };

export function RecentRecommendationCard({ recommendation }: Props) {
  const crops = recommendation.land_division
    .map((d) => `${d.crop} ${d.acres} ac`)
    .join(" · ");

  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
          Recent recommendation
        </Text>
        <Chip label="Active" tone="success" />
      </View>
      <Text className="font-sans-bold text-base text-forest">{crops}</Text>
      <Text className="text-xs text-ink-muted">
        Est. profit ₹{(recommendation.profit_inr.low / 100000).toFixed(1)}–
        {(recommendation.profit_inr.high / 100000).toFixed(1)} L ·{" "}
        {recommendation.confidence_pct}% confidence
      </Text>
    </Card>
  );
}
