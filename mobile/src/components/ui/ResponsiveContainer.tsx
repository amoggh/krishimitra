import React from "react";
import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useResponsive } from "@/theme/responsive";

export type ResponsiveContainerProps = ViewProps & {
  maxWidth?: number;
  padded?: boolean;
  center?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Responsive layout container that adapts cleanly across mobile, tablet, and desktop:
 * - Mobile: 320px–767px (full width, 16px gutter)
 * - Tablet: 768px–1023px (centered, 24px gutter, max-w-2xl/3xl)
 * - Desktop: 1024px and above (centered, 32px gutter, max-w-5xl / 1140px)
 */
export function ResponsiveContainer({
  maxWidth,
  padded = true,
  center = true,
  children,
  className = "",
  style,
  ...rest
}: ResponsiveContainerProps) {
  const { isDesktop, isTablet, contentMaxWidth } = useResponsive();

  const resolvedMaxWidth = maxWidth ?? (isDesktop ? contentMaxWidth : isTablet ? 840 : undefined);

  const paddingClasses = padded
    ? isDesktop
      ? "px-8"
      : isTablet
      ? "px-6"
      : "px-4"
    : "";

  return (
    <View
      className={`w-full ${paddingClasses} ${className}`}
      style={[
        resolvedMaxWidth
          ? {
              maxWidth: resolvedMaxWidth,
              ...(center ? { alignSelf: "center" as const } : {}),
            }
          : {},
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default ResponsiveContainer;

