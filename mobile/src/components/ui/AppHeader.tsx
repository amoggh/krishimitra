import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Bell } from "lucide-react-native";
import { CircularIconButton } from "./CircularIconButton";
import { colors } from "@/theme/tokens";

export type AppHeaderProps = ViewProps & {
  title?: string;
  subtitle?: string;
  variant?: "light" | "forest";
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: string;
  rightAction?: React.ReactNode;
  showNotificationBell?: boolean;
  onNotificationPress?: () => void;
  hasNotification?: boolean;
  className?: string;
};

export function AppHeader({
  title,
  subtitle,
  variant = "light",
  showBack = false,
  onBack,
  fallbackRoute = "Main",
  rightAction,
  showNotificationBell = false,
  onNotificationPress,
  hasNotification = false,
  className = "",
  style,
  ...rest
}: AppHeaderProps) {
  const navigation = useNavigation<any>();
  const isForest = variant === "forest";

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate(fallbackRoute);
    }
  }

  const iconColor = isForest ? colors.white : colors.textPrimary;
  const buttonVariant = isForest ? "translucent" : "white";

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${
        isForest ? "bg-primary" : "bg-transparent"
      } ${className}`}
      style={style}
      {...rest}
    >
      {/* Left Slot: Back Button */}
      <View className="w-10 items-start justify-center">
        {showBack ? (
          <CircularIconButton
            icon={<ArrowLeft size={18} color={iconColor} />}
            variant={buttonVariant}
            onPress={handleBack}
            accessibilityLabel="Go back"
          />
        ) : null}
      </View>

      {/* Center Slot: Title & Subtitle */}
      <View className="flex-1 items-center justify-center px-2">
        {title && (
          <Text
            className={`font-sans-bold text-base tracking-tight ${
              isForest ? "text-white" : "text-ink"
            }`}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            className={`font-sans text-xs ${
              isForest ? "text-white/75" : "text-ink-muted"
            }`}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Slot: Custom Action or Notification Bell */}
      <View className="w-10 items-end justify-center">
        {rightAction ? (
          rightAction
        ) : showNotificationBell ? (
          <CircularIconButton
            icon={<Bell size={18} color={iconColor} />}
            variant={buttonVariant}
            onPress={onNotificationPress}
            hasNotificationDot={hasNotification}
            accessibilityLabel="Notifications"
          />
        ) : null}
      </View>
    </View>
  );
}

export default AppHeader;

