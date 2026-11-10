import React from "react";
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type CircularIconButtonProps = PressableProps & {
  icon: React.ReactNode;
  variant?: "light" | "white" | "translucent" | "primary";
  size?: number;
  hasNotificationDot?: boolean;
  notificationDotColor?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function CircularIconButton({
  icon,
  variant = "white",
  size = 40,
  hasNotificationDot = false,
  notificationDotColor = colors.accent,
  className = "",
  style,
  ...rest
}: CircularIconButtonProps) {
  const bgClass =
    variant === "white"
      ? "bg-white border border-[#183B2B]/[0.08]"
      : variant === "translucent"
      ? "bg-white/15 border border-white/20"
      : variant === "primary"
      ? "bg-primary text-white"
      : "bg-cream-dark border border-cream-muted";

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      className={`items-center justify-center active:scale-[0.95] active:opacity-75 ${bgClass} ${className}`}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          ...(variant === "white" ? shadows.subtle : {}),
        },
        style,
      ]}
      {...rest}
    >
      {icon}

      {hasNotificationDot && (
        <View
          className="absolute right-1 top-1"
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: notificationDotColor,
            borderWidth: 1.5,
            borderColor: variant === "translucent" ? colors.primary : colors.white,
          }}
        />
      )}
    </Pressable>
  );
}

export default CircularIconButton;

