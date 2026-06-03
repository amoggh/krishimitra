import { Text, View } from "react-native";
import { Card } from "@/components/ui";

type Props = {
  type: string;
  ph: number;
  npk: string;
};

export function SoilSummaryCard({ type, ph, npk }: Props) {
  return (
    <Card className="flex-1">
      <Text className="font-sans-bold text-[11px] uppercase tracking-wide text-ink-light">Soil</Text>
      <Text className="font-sans-extrabold text-base text-forest-dark">{type}</Text>
      <Text className="text-xs text-ink-muted">pH {ph} · NPK {npk}</Text>
    </Card>
  );
}

export function WaterBudgetCard({ litresPerAcre }: { litresPerAcre: number }) {
  return (
    <Card className="flex-1">
      <Text className="font-sans-bold text-[11px] uppercase tracking-wide text-ink-light">
        Water budget
      </Text>
      <Text className="font-sans-extrabold text-base text-forest-dark">
        {(litresPerAcre / 1000).toFixed(1)}K L
      </Text>
      <Text className="text-xs text-ink-muted">/acre · Kharif</Text>
    </Card>
  );
}
