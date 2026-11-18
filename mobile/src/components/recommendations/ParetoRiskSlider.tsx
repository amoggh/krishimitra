import React from "react";
import { View, Text, Pressable } from "react-native";
import { ShieldCheck, TrendingUp, Zap } from "lucide-react-native";
import { colors } from "@/theme/tokens";

export interface ParetoRiskSliderProps {
  currentIndex: number;
  totalOptions: number;
  onChange: (index: number) => void;
  safeLabel?: string;
  profitLabel?: string;
}

export function ParetoRiskSlider({
  currentIndex,
  totalOptions = 5,
  onChange,
  safeLabel = "Play Safe (Minimum Downside)",
  profitLabel = "Chase Profit (Maximum Upside)",
}: ParetoRiskSliderProps) {
  const steps = Array.from({ length: totalOptions }, (_, i) => i);

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <ShieldCheck size={16} color={colors.primary} />
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
            Pareto Risk Frontier
          </Text>
        </View>
        <Text className="font-sans-bold text-xs text-primary">
          Option {currentIndex + 1} of {totalOptions}
        </Text>
      </View>

      <View className="flex-row items-center justify-between py-1">
        <Text className="font-sans text-[11px] text-ink-muted">◀ {safeLabel}</Text>
        <Text className="font-sans text-[11px] text-forest">{profitLabel} ▶</Text>
      </View>

      {/* Interactive Step Slider Bar */}
      <View className="my-3 flex-row items-center justify-between px-2">
        {steps.map((idx) => {
          const isSelected = idx === currentIndex;
          const isPast = idx < currentIndex;
          return (
            <Pressable
              key={idx}
              onPress={() => onChange(idx)}
              className="items-center justify-center p-1"
            >
              <View
                className={`h-7 w-7 items-center justify-center rounded-full border transition-all ${
                  isSelected
                    ? "bg-primary border-primary scale-110 shadow-sm"
                    : isPast
                    ? "bg-sage border-primary/40"
                    : "bg-cream border-borderSubtle"
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    isSelected ? "text-white" : "text-ink"
                  }`}
                >
                  {idx + 1}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-center font-sans text-[11px] text-ink-muted">
        {currentIndex === 0
          ? "Diversified safe split: protects your capital even in severe drought or market crash."
          : currentIndex === totalOptions - 1
          ? "Aggressive profit focus: higher upside return with higher exposure to market swings."
          : "Balanced trade-off: strong expected profits while mitigating single-crop failure risk."}
      </Text>
    </View>
  );
}

export default ParetoRiskSlider;
