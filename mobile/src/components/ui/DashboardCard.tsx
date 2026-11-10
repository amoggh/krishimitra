import React from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import { Card, type CardVariant } from "./Card";
import { ChevronRight } from "lucide-react-native";
import { colors } from "@/theme/tokens";

export type DashboardCardProps = ViewProps & {
  title?: string;
  subtitle?: string;
  headerIcon?: React.ReactNode;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
  headerRight?: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
};

export function DashboardCard({
  title,
  subtitle,
  headerIcon,
  headerActionLabel,
  onHeaderAction,
  headerRight,
  variant = "default",
  className = "",
  children,
  ...rest
}: DashboardCardProps) {
  const hasHeader = Boolean(title || headerIcon || headerActionLabel || headerRight);
  const isForest = variant === "forest";

  return (
    <Card variant={variant} className={className} {...rest}>
      {hasHeader && (
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-2">
            {headerIcon && <View className="items-center justify-center">{headerIcon}</View>}
            <View className="flex-1">
              {title && (
                <Text
                  className={`font-sans-bold text-base ${
                    isForest ? "text-white" : "text-ink"
                  }`}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  className={`text-xs ${
                    isForest ? "text-white/70" : "text-ink-muted"
                  }`}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {headerRight ? (
            headerRight
          ) : headerActionLabel ? (
            <Pressable
              onPress={onHeaderAction}
              accessibilityRole="button"
              className="flex-row items-center gap-0.5 active:opacity-70"
            >
              <Text
                className={`font-sans-semibold text-xs ${
                  isForest ? "text-accent" : "text-primary"
                }`}
              >
                {headerActionLabel}
              </Text>
              <ChevronRight
                size={14}
                color={isForest ? colors.accent : colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      )}

      {children}
    </Card>
  );
}

export default DashboardCard;

