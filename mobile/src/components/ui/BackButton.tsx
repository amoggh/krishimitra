import React from "react";
import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type BackButtonProps = {
  label?: string;
  onPress?: () => void;
  fallbackRoute?: string;
  light?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Universal back button designed for web and mobile.
 * Guarantees that users on web (and native) can always return to the previous page,
 * falling back safely to the main screen if there is no previous history.
 */
export function BackButton({
  label = "Back",
  onPress,
  fallbackRoute = "Main",
  light = false,
  className = "",
  style,
}: BackButtonProps) {
  const navigation = useNavigation<any>();

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate(fallbackRoute);
    }
  }

  const iconColor = light ? colors.white : colors.primary;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Go back: ${label}`}
      className={`self-start flex-row items-center rounded-full px-3 py-1.5 active:opacity-75 ${
        light
          ? "bg-white/20 active:bg-white/30"
          : "border border-[#183B2B]/[0.08] bg-white active:bg-cream"
      } ${className}`}
      style={[
        !light ? shadows.subtle : {},
        { borderRadius: radii.full },
        style,
      ]}
    >
      <ArrowLeft size={14} color={iconColor} />
      {label ? (
        <Text
          className={`ml-1.5 font-sans-bold text-xs ${
            light ? "text-white" : "text-primary"
          }`}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default BackButton;
