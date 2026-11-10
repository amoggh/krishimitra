import React from "react";
import { View, Text, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii } from "@/theme/tokens";

export type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold"
  | "neutral"
  | "primary";

export type BadgeVariant = "subtle" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

export type BadgeProps = ViewProps & {
  label: string;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const TONE_SUBTLE: Record<
  BadgeTone,
  { bg: string; text: string; dot: string; border: string }
> = {
  success: {
    bg: "bg-sage",
    text: "text-primary",
    dot: colors.primary,
    border: "border-sage-dark",
  },
  primary: {
    bg: "bg-sage",
    text: "text-primary",
    dot: colors.primary,
    border: "border-sage-dark",
  },
  gold: {
    bg: "bg-gold-light",
    text: "text-accent-dark",
    dot: colors.accent,
    border: "border-gold/30",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-warning",
    dot: colors.warning,
    border: "border-amber-200",
  },
  danger: {
    bg: "bg-red-50",
    text: "text-danger",
    dot: colors.danger,
    border: "border-red-200",
  },
  info: {
    bg: "bg-sky-50",
    text: "text-info",
    dot: colors.info,
    border: "border-sky-200",
  },
  neutral: {
    bg: "bg-cream-dark",
    text: "text-ink-muted",
    dot: colors.textSecondary,
    border: "border-cream-muted",
  },
};

const TONE_SOLID: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  success: { bg: "bg-primary", text: "text-white", dot: colors.white },
  primary: { bg: "bg-primary", text: "text-white", dot: colors.white },
  gold: { bg: "bg-gold", text: "text-ink", dot: colors.textPrimary },
  warning: { bg: "bg-warning", text: "text-white", dot: colors.white },
  danger: { bg: "bg-danger", text: "text-white", dot: colors.white },
  info: { bg: "bg-info", text: "text-white", dot: colors.white },
  neutral: { bg: "bg-ink-muted", text: "text-white", dot: colors.white },
};

export function StatusDot({
  tone = "success",
  size = 6,
}: {
  tone?: BadgeTone;
  size?: number;
}) {
  const dotColor = TONE_SUBTLE[tone]?.dot ?? colors.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dotColor,
      }}
    />
  );
}

export function Badge({
  label,
  tone = "success",
  variant = "subtle",
  size = "sm",
  dot = false,
  leftIcon,
  rightIcon,
  className = "",
  style,
  ...rest
}: BadgeProps) {
  const isSolid = variant === "solid";
  const isOutline = variant === "outline";

  const subtleConfig = TONE_SUBTLE[tone] || TONE_SUBTLE.success;
  const solidConfig = TONE_SOLID[tone] || TONE_SOLID.success;

  const containerBg = isSolid
    ? solidConfig.bg
    : isOutline
    ? "bg-transparent border " + subtleConfig.border
    : subtleConfig.bg;

  const textColor = isSolid ? solidConfig.text : subtleConfig.text;
  const dotColor = isSolid ? solidConfig.dot : subtleConfig.dot;

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-[11px]"
      : "px-3 py-1 text-xs";

  return (
    <View
      className={`self-start flex-row items-center gap-1.5 rounded-full ${containerBg} ${sizeClasses} ${className}`}
      style={[{ borderRadius: radii.full }, style]}
      {...rest}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dotColor,
          }}
        />
      )}
      {leftIcon && <View className="items-center justify-center">{leftIcon}</View>}
      <Text className={`font-sans-bold ${textColor}`}>{label}</Text>
      {rightIcon && <View className="items-center justify-center">{rightIcon}</View>}
    </View>
  );
}

export default Badge;

