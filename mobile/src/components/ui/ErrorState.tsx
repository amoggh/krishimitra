import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { AppButton } from "./AppButton";
import { colors, radii } from "@/theme/tokens";

export type ErrorStateProps = ViewProps & {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't connect to the server. Please check your connection and try again.",
  icon,
  onRetry,
  retryLabel = "Try Again",
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  style,
  ...rest
}: ErrorStateProps) {
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
      <View className="mb-3.5 h-14 w-14 items-center justify-center rounded-full bg-red-50">
        {icon ?? <AlertCircle size={28} color={colors.danger} />}
      </View>

      <Text className="text-center font-sans-bold text-base text-ink tracking-tight">
        {title}
      </Text>

      <Text className="mt-1 text-center font-sans text-xs leading-5 text-ink-muted max-w-xs">
        {message}
      </Text>

      {(onRetry || secondaryActionLabel) && (
        <View className="mt-4 w-full max-w-xs items-center gap-2">
          {onRetry && (
            <AppButton
              label={retryLabel}
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw size={14} color={colors.white} />}
              onPress={onRetry}
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

export default ErrorState;

