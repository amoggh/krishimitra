import React from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import { TrendingUp, TrendingDown, Store } from "lucide-react-native";
import { Badge } from "./Badge";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { colors, radii, shadows } from "@/theme/tokens";

export type PriceTrendCardProps = ViewProps & {
  crop: string;
  mandi: string;
  priceInr: number;
  changePct: number;
  updatedAt?: string;
  trend7d?: number[];
  isRecommended?: boolean;
  onPress?: () => void;
  className?: string;
};

export function PriceTrendCard({
  crop,
  mandi,
  priceInr,
  changePct,
  updatedAt = "Live",
  trend7d,
  isRecommended = false,
  onPress,
  className = "",
  style,
  ...rest
}: PriceTrendCardProps) {
  const isUp = changePct >= 0;

  const content = (
    <View
      className={`mb-2.5 bg-white p-3.5 border border-[#183B2B]/[0.06] ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.subtle,
        },
        style,
      ]}
      {...rest}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-sans-bold text-base text-ink">{crop}</Text>
            {isRecommended && (
              <Badge label="Recommended" tone="success" size="sm" />
            )}
          </View>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Store size={11} color={colors.textSecondary} />
            <Text className="font-sans text-xs text-ink-muted">
              {mandi} · {updatedAt}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="font-sans-extrabold text-lg text-primary tracking-tight">
            ₹{priceInr.toLocaleString("en-IN")}
            <Text className="font-sans-medium text-xs text-ink-muted">/q</Text>
          </Text>

          <View className="mt-0.5 flex-row items-center gap-0.5">
            {isUp ? (
              <TrendingUp size={12} color={colors.primary} />
            ) : (
              <TrendingDown size={12} color={colors.danger} />
            )}
            <Text
              className={`font-sans-bold text-xs ${
                isUp ? "text-primary" : "text-danger"
              }`}
            >
              {isUp ? "+" : ""}
              {changePct}%
            </Text>
          </View>
        </View>
      </View>

      {trend7d && trend7d.length > 0 && (
        <View className="mt-2.5 pt-2 border-t border-cream-muted/50">
          <MiniBarChart data={trend7d} barColor={isUp ? colors.primary : colors.danger} />
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

export default PriceTrendCard;

