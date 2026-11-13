import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { Sprout } from "lucide-react-native";
import { AppButton } from "./AppButton";
import { colors, radii } from "@/theme/tokens";

export type EmptyStateProps = ViewProps & {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  style,
  ...rest
}: EmptyStateProps) {
  return (
    <View
      className={`items-center justify-center p-6 text-center bg-white border border-[#183B2B]/[0.06] ${className}`}
      style={[
        {
          borderRadius: radii.card,
        },
        style,
      ]}
      {...rest}
    >
      <View className="mb-3.5 h-16 w-16 items-center justify-center rounded-full bg-sage">
        {icon ?? <Sprout size={32} color={colors.primary} />}
      </View>

      <Text className="text-center font-sans-bold text-lg text-ink tracking-tight">
        {title}
      </Text>

      <Text className="mt-1 text-center font-sans text-xs leading-5 text-ink-muted max-w-xs">
        {description}
      </Text>

      {(actionLabel || secondaryActionLabel) && (
        <View className="mt-5 w-full max-w-xs items-center gap-2">
          {actionLabel && onAction && (
            <AppButton
              label={actionLabel}
              variant="primary"
              size="md"
              onPress={onAction}
            />
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <AppButton
              label={secondaryActionLabel}
              variant="ghost"
              size="sm"
              onPress={onSecondaryAction}
            />
          )}
        </View>
      )}
    </View>
  );
}

export default EmptyState;

