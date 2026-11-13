import React from "react";
import { View, Text } from "react-native";
import { Layers, Droplets } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/theme/tokens";

type SoilProps = {
  type: string;
  ph: number;
  npk: string;
};

export function SoilSummaryCard({ type, ph, npk }: SoilProps) {
  return (
    <Card className="flex-1 mb-0 p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-bold text-[10px] uppercase tracking-wider text-ink-muted">
          Soil Health
        </Text>
        <View className="h-6 w-6 items-center justify-center rounded-full bg-sage">
          <Layers size={13} color={colors.primary} />
        </View>
      </View>
      <Text className="mt-1 font-sans-extrabold text-base text-ink" numberOfLines={1}>
        {type}
      </Text>
      <Text className="mt-0.5 font-sans text-xs text-ink-muted">
        pH {ph} · NPK {npk}
      </Text>
    </Card>
  );
}

export function WaterBudgetCard({ litresPerAcre }: { litresPerAcre: number }) {
  return (
    <Card className="flex-1 mb-0 p-3.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-bold text-[10px] uppercase tracking-wider text-ink-muted">
          Water Budget
        </Text>
        <View className="h-6 w-6 items-center justify-center rounded-full bg-sage">
          <Droplets size={13} color={colors.primary} />
        </View>
      </View>
      <Text className="mt-1 font-sans-extrabold text-base text-primary">
        {(litresPerAcre / 1000).toFixed(1)}K L
      </Text>
      <Text className="mt-0.5 font-sans text-xs text-ink-muted">
        /day · Kharif est.
      </Text>
    </Card>
  );
}

export default SoilSummaryCard;
