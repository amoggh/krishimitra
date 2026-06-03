import { Text, View } from "react-native";
import { Card, Chip } from "@/components/ui";
import type { CropRecommendation } from "@/types/api";

type Props = {
  crop: CropRecommendation;
  accent?: "green" | "earth";
};

export function CropRecommendationCard({ crop, accent = "green" }: Props) {
  const borderColor = accent === "earth" ? "border-earth-soft" : "border-green";

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <View className="mb-2 flex-row items-start justify-between">
        <View>
          <Text className="font-sans-extrabold text-base text-forest">{crop.crop}</Text>
          <Text className="text-xs text-ink-muted">
            {crop.acres} acres · {crop.input_tier} input tier
          </Text>
        </View>
        <Chip
          label={crop.risk_level === "low" ? "Low risk" : crop.risk_level === "medium" ? "Med risk" : "High risk"}
          tone={crop.risk_level === "low" ? "success" : crop.risk_level === "medium" ? "warning" : "danger"}
        />
      </View>
      <View className="flex-row flex-wrap gap-y-2">
        <Metric label="Yield" value={`${crop.yield_quintals_per_acre.low}–${crop.yield_quintals_per_acre.high} q/ac`} />
        <Metric label="Water" value={crop.water_usage_pct <= 90 ? "Within budget" : `${crop.water_usage_pct}% budget`} />
        <Metric
          label="Price"
          value={`₹${(crop.price_per_quintal.low / 1000).toFixed(1)}–${(crop.price_per_quintal.high / 1000).toFixed(1)}k/q`}
        />
        <Metric
          label="Profit"
          value={`₹${Math.round(crop.profit_inr.low / 1000)}k–${Math.round(crop.profit_inr.high / 1000)}k`}
        />
      </View>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2">
      <Text className="font-sans-bold text-[11px] uppercase text-ink-light">{label}</Text>
      <Text className="font-sans-semibold text-xs text-ink">{value}</Text>
    </View>
  );
}
