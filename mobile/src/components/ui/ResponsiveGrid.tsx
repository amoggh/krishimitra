import React from "react";
import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useResponsive } from "@/theme/responsive";

export type ResponsiveGridProps = ViewProps & {
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Responsive grid layout adapting item count and gap naturally:
 * - Mobile: 1 column default
 * - Tablet: 2 columns default
 * - Desktop: 3 columns default (or 4 when specified)
 */
export function ResponsiveGrid({
  columns,
  gap = 12,
  children,
  className = "",
  style,
  ...rest
}: ResponsiveGridProps) {
  const { isDesktop, isTablet } = useResponsive();

  const numCols = isDesktop
    ? columns?.desktop ?? 3
    : isTablet
    ? columns?.tablet ?? 2
    : columns?.mobile ?? 1;

  const childArray = React.Children.toArray(children).filter(Boolean);

  if (numCols === 1) {
    return (
      <View className={`w-full ${className}`} style={style} {...rest}>
        {childArray.map((child, idx) => (
          <View
            key={idx}
            style={{ marginBottom: idx === childArray.length - 1 ? 0 : gap }}
          >
            {child}
          </View>
        ))}
      </View>
    );
  }

  // Multi-column flex wrap
  const itemWidthPercent = `${(100 / numCols).toFixed(4)}%` as any;

  return (
    <View
      className={`w-full flex-row flex-wrap ${className}`}
      style={[
        {
          marginHorizontal: -gap / 2,
        },
        style,
      ]}
      {...rest}
    >
      {childArray.map((child, idx) => (
        <View
          key={idx}
          style={{
            width: itemWidthPercent,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export default ResponsiveGrid;

