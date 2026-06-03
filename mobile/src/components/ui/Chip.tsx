import { Pressable, Text } from "react-native";

type Tone = "default" | "success" | "warning" | "danger" | "active";

const toneStyles: Record<Tone, string> = {
  default: "bg-green-pale",
  success: "bg-green-pale",
  warning: "bg-amber-50",
  danger: "bg-red-50",
  active: "bg-forest",
};

const textStyles: Record<Tone, string> = {
  default: "text-forest",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  active: "text-white",
};

type Props = {
  label: string;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, tone = "default", selected, onPress }: Props) {
  const resolved = selected ? "active" : tone;
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${toneStyles[resolved]}`}
    >
      <Text className={`font-sans-semibold text-xs ${textStyles[resolved]}`}>{label}</Text>
    </Pressable>
  );
}
