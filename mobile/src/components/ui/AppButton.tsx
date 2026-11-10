import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "gold"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export type AppButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const VARIANT_CONTAINER: Record<ButtonVariant, { bg: string; border?: string; text: string }> = {
  primary: {
    bg: "bg-primary active:bg-primary-dark",
    text: "text-white",
  },
  secondary: {
    bg: "bg-sage active:bg-sage-dark",
    text: "text-primary",
  },
  outline: {
    bg: "bg-white border-2 border-primary active:bg-sage-light",
    text: "text-primary",
  },
  gold: {
    bg: "bg-gold active:bg-gold-dark",
    text: "text-ink",
  },
  ghost: {
    bg: "bg-transparent active:bg-sage/40",
    text: "text-primary",
  },
  danger: {
    bg: "bg-danger active:opacity-90",
    text: "text-white",
  },
};

const SIZE_STYLES: Record<
  ButtonSize,
  { height: string; px: string; py: string; text: string; iconSize: number }
> = {
  sm: {
    height: "h-9",
    px: "px-3.5",
    py: "py-1.5",
    text: "text-xs font-sans-bold",
    iconSize: 14,
  },
  md: {
    height: "h-12",
    px: "px-5",
    py: "py-3",
    text: "text-sm font-sans-bold",
    iconSize: 16,
  },
  lg: {
    height: "h-14",
    px: "px-6",
    py: "py-3.5",
    text: "text-base font-sans-bold",
    iconSize: 18,
  },
};

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = true,
  className = "",
  style,
  textStyle,
  ...rest
}: AppButtonProps) {
  const variantStyles = VARIANT_CONTAINER[variant];
  const sizeStyles = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const spinnerColor =
    variant === "primary" || variant === "danger" ? colors.white : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-full ${
        sizeStyles.height
      } ${sizeStyles.px} ${variantStyles.bg} ${variantStyles.border ?? ""} ${
        fullWidth ? "w-full" : "self-start"
      } ${isDisabled ? "opacity-50" : "active:scale-[0.98]"} ${className}`}
      style={({ pressed }) => [
        variant === "primary" ? shadows.subtle : {},
        {
          borderRadius: radii.pill,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon && <View className="items-center justify-center">{leftIcon}</View>}
          <Text
            className={`text-center ${sizeStyles.text} ${variantStyles.text}`}
            style={textStyle}
          >
            {label}
          </Text>
          {rightIcon && <View className="items-center justify-center">{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

export default AppButton;

