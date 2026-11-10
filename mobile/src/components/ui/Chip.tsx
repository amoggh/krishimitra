import { Pressable, Text, type ViewStyle, type StyleProp } from "react-native";
import { radii } from "@/theme/tokens";

type Tone = "default" | "success" | "warning" | "danger" | "active" | "gold";

const toneStyles: Record<Tone, string> = {
  default: "bg-sage border border-sage-dark/40",
  success: "bg-sage border border-sage-dark/50",
  gold: "bg-gold-light border border-gold/30",
  warning: "bg-amber-50 border border-amber-200",
  danger: "bg-red-50 border border-red-200",
  active: "bg-primary border border-primary-dark",
};

const textStyles: Record<Tone, string> = {
  default: "text-primary",
  success: "text-primary",
  gold: "text-ink",
  warning: "text-warning",
  danger: "text-danger",
  active: "text-white",
};

type Props = {
  label: string;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  tone = "default",
  selected,
  onPress,
  className = "",
  style,
}: Props) {
  const resolved = selected ? "active" : tone;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`rounded-full px-3 py-1.5 active:opacity-75 ${toneStyles[resolved]} ${className}`}
      style={[{ borderRadius: radii.full }, style]}
    >
      <Text className={`font-sans-bold text-xs ${textStyles[resolved]}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default Chip;
