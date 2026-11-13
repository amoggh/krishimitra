import React from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import { Sprout, Droplets, TrendingUp, AlertCircle, ShieldCheck } from "lucide-react-native";
import { Badge } from "./Badge";
import { colors, radii, shadows } from "@/theme/tokens";

export type CropCardProps = ViewProps & {
  cropName: string;
  acres: number;
  percentage: number;
  expectedYield?: string;
  expectedPrice?: string;
  profitRange?: string;
  waterMm?: number;
  riskLevel?: "low" | "medium" | "high";
  colorAccent?: string;
  onPress?: () => void;
  className?: string;
};

export function CropCard({
  cropName,
  acres,
  percentage,
  expectedYield = "–",
  expectedPrice = "–",
  profitRange = "–",
  waterMm,
  riskLevel = "low",
  colorAccent = colors.primary,
  onPress,
  className = "",
  style,
  ...rest
}: CropCardProps) {
  const formattedCrop =
    cropName.charAt(0).toUpperCase() + cropName.slice(1);

  const riskTone =
    riskLevel === "low"
      ? "success"
      : riskLevel === "medium"
      ? "warning"
      : "danger";

  const riskLabel =
    riskLevel === "low"
      ? "Low Risk"
      : riskLevel === "medium"
      ? "Med Risk"
      : "High Risk";

  const content = (
    <View
      className={`mb-3 bg-white p-4 border border-[#183B2B]/[0.06] ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.card,
        },
        style,
      ]}
      {...rest}
    >
      {/* Header Row: Crop title + Badges */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: colorAccent }}
            />
            <Text className="font-sans-bold text-lg text-ink tracking-tight">
              {formattedCrop}
            </Text>
          </View>
          <Text className="mt-0.5 font-sans text-xs text-ink-muted">
            {acres.toFixed(2)} acres · {percentage.toFixed(0)}% of farm
          </Text>
        </View>

        <Badge
          label={riskLabel}
          tone={riskTone}
          dot
          size="sm"
        />
      </View>

      {/* Metrics Row: 3 columns */}
      <View className="mt-3.5 flex-row items-stretch justify-between rounded-xl bg-cream p-3">
        <View className="flex-1">
          <Text className="font-sans-medium text-[10px] uppercase text-ink-muted">
            Yield
          </Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-ink">
            {expectedYield}
          </Text>
        </View>

        <View className="h-full w-[1px] bg-cream-muted mx-2" />

        <View className="flex-1">
          <Text className="font-sans-medium text-[10px] uppercase text-ink-muted">
            Mandi Price
          </Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-primary">
            {expectedPrice}
          </Text>
        </View>

        <View className="h-full w-[1px] bg-cream-muted mx-2" />

        <View className="flex-1">
          <Text className="font-sans-medium text-[10px] uppercase text-ink-muted">
            Est. Profit
          </Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-ink">
            {profitRange}
          </Text>
        </View>
      </View>

      {/* Water requirement footer if available */}
      {waterMm !== undefined && (
        <View className="mt-2.5 flex-row items-center justify-between pt-2 border-t border-cream-muted/60">
          <View className="flex-row items-center gap-1">
            <Droplets size={12} color={colors.primary} />
            <Text className="font-sans text-[11px] text-ink-muted">
              Water Need: <Text className="font-sans-bold text-ink">{waterMm} mm</Text>
            </Text>
          </View>
          <Text className="font-sans-medium text-[10px] text-primary">
            Balanced with budget
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-85">
        {content}
      </Pressable>
    );
  }

  return content;
}

export default CropCard;

