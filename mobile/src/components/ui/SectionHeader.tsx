import React from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { colors } from "@/theme/tokens";

export type SectionHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  badge?: string | number;
  actionLabel?: string;
  actionType?: "link" | "circleButton";
  onActionPress?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  badge,
  actionLabel = "View all",
  actionType = "link",
  onActionPress,
  rightElement,
  className = "",
  style,
  ...rest
}: SectionHeaderProps) {
  const hasAction = Boolean(onActionPress);

  return (
    <View
      className={`mb-3 mt-4 flex-row items-center justify-between ${className}`}
      style={style}
      {...rest}
    >
      <View className="flex-1 pr-2">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-bold text-base text-ink tracking-tight">
            {title}
          </Text>
          {badge !== undefined && (
            <View className="rounded-full bg-sage px-2 py-0.5">
              <Text className="font-sans-bold text-[11px] text-primary">
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text className="mt-0.5 font-sans text-xs text-ink-muted">
            {subtitle}
          </Text>
        )}
      </View>

      {rightElement ? (
        rightElement
      ) : hasAction ? (
        actionType === "circleButton" ? (
          <Pressable
            onPress={onActionPress}
            accessibilityRole="button"
            accessibilityLabel={`${title} action`}
            className="h-8 w-8 items-center justify-center rounded-full border border-cream-muted bg-white active:bg-cream"
          >
            <ArrowRight size={14} color={colors.ink} />
          </Pressable>
        ) : (
          <Pressable
            onPress={onActionPress}
            accessibilityRole="button"
            className="flex-row items-center gap-0.5 py-1 active:opacity-75"
          >
            <Text className="font-sans-semibold text-xs text-primary">
              {actionLabel}
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        )
      ) : null}
    </View>
  );
}

export default SectionHeader;

