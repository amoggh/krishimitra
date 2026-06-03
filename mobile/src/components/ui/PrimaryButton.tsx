import { Pressable, Text, type PressableProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/colors";

type Props = PressableProps & {
  label: string;
  variant?: "primary" | "outline";
};

export function PrimaryButton({
  label,
  variant = "primary",
  disabled,
  ...rest
}: Props) {
  if (variant === "outline") {
    return (
      <Pressable
        className="rounded-btn border-2 border-green-pale bg-white py-3.5"
        disabled={disabled}
        {...rest}
      >
        <Text className="text-center font-sans-bold text-base text-forest">{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable disabled={disabled} className="overflow-hidden rounded-btn" {...rest}>
      <LinearGradient
        colors={[colors.forest, colors.green]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="py-3.5"
      >
        <Text className="text-center font-sans-bold text-base text-white">{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
