import { Text, View } from "react-native";

type Props = {
  score: number;
  max?: number;
  color?: string;
};

export function RiskMeter({ score, max = 100, color }: Props) {
  const pct = Math.min(100, (score / max) * 100);

  return (
    <View className="my-2 h-2 overflow-hidden rounded-full bg-cream-dark">
      <View
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          backgroundColor: color ?? "#d68910",
        }}
      />
    </View>
  );
}

export function RiskMeterLabel({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1 flex-row justify-between">
      <Text className="font-sans-bold text-sm text-ink">{label}</Text>
      <Text className="font-sans-semibold text-xs text-ink-muted">{value}</Text>
    </View>
  );
}
