import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

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
 * falling back safely to the main screen if there is no previous history (e.g. on direct URL / refresh).
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
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(fallbackRoute);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Go back: ${label}`}
      className={`self-start flex-row items-center rounded-full px-3 py-1.5 active:opacity-75 ${
        light
          ? "bg-white/20 active:bg-white/30"
          : "border border-cream-dark bg-white active:bg-cream"
      } ${className}`}
      style={style}
    >
      <Text
        className={`mr-1.5 text-base leading-none ${
          light ? "text-white" : "text-forest"
        }`}
      >
        ←
      </Text>
      <Text
        className={`font-sans-semibold text-xs ${
          light ? "text-white" : "text-forest"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
