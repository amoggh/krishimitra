import React from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type StatCardVariant = "default" | "sage" | "gold" | "white";

export type StatCardProps = ViewProps & {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction?: "up" | "down" | "neutral";
    label?: string;
  };
  variant?: StatCardVariant;
  onPress?: () => void;
  className?: string;
};

const VARIANT_CONFIGS: Record<
  StatCardVariant,
  { bg: string; iconBg: string; border: string; valueColor: string }
> = {
  default: {
    bg: "bg-white",
    iconBg: "bg-sage",
    border: "border border-[#183B2B]/[0.06]",
    valueColor: "text-ink",
  },
  white: {
    bg: "bg-white",
    iconBg: "bg-sage",
    border: "border border-cream-muted",
    valueColor: "text-primary",
  },
  sage: {
    bg: "bg-sage",
    iconBg: "bg-white",
    border: "border border-sage-dark/50",
    valueColor: "text-primary-dark",
  },
  gold: {
    bg: "bg-gold-light",
    iconBg: "bg-white",
    border: "border border-gold/30",
    valueColor: "text-ink",
  },
};

export function StatCard({
  label,
  value,
  unit,
  subtext,
  icon,
  trend,
  variant = "default",
  onPress,
  className = "",
  style,
  ...rest
}: StatCardProps) {
  const config = VARIANT_CONFIGS[variant];

  const content = (
    <View
      className={`p-4 ${config.bg} ${config.border} ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.subtle,
        },
        style,
      ]}
      {...rest}
    >
      {/* Top row: Label & Icon */}
      <View className="flex-row items-center justify-between">
        <Text
          className="font-sans-semibold text-[11px] uppercase tracking-wider text-ink-muted"
          numberOfLines={1}
        >
          {label}
        </Text>
        {icon && (
          <View
            className={`h-8 w-8 items-center justify-center rounded-full ${config.iconBg}`}
          >
            {icon}
          </View>
        )}
      </View>

      {/* Metric Value */}
      <View className="mt-2 flex-row items-baseline gap-1">
        <Text
          className={`font-sans-extrabold text-2xl tracking-tight ${config.valueColor}`}
        >
          {value}
        </Text>
        {unit && (
          <Text className="font-sans-medium text-xs text-ink-muted">{unit}</Text>
        )}
      </View>

      {/* Bottom row: Trend or Subtext */}
      {(trend || subtext) && (
        <View className="mt-2.5 flex-row items-center gap-1.5">
          {trend && (
            <View
              className={`flex-row items-center gap-0.5 rounded-full px-2 py-0.5 ${
                trend.direction === "down"
                  ? "bg-red-50 text-danger"
                  : "bg-sage text-primary"
              }`}
            >
              {trend.direction === "down" ? (
                <TrendingDown size={12} color={colors.danger} />
              ) : (
                <TrendingUp size={12} color={colors.primary} />
              )}
              <Text
                className={`font-sans-bold text-[11px] ${
                  trend.direction === "down" ? "text-danger" : "text-primary"
                }`}
              >
                {trend.value}
              </Text>
            </View>
          )}
          {subtext && (
            <Text
              className="flex-1 font-sans text-[11px] text-ink-muted"
              numberOfLines={1}
            >
              {subtext}
            </Text>
          )}
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

export default StatCard;

