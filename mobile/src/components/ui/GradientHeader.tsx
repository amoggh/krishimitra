import { LinearGradient } from "expo-linear-gradient";
import { View, type ViewProps } from "react-native";
import { colors } from "@/theme/colors";

export function GradientHeader({ children, className, ...rest }: ViewProps) {
  return (
    <LinearGradient
      colors={[colors.forestDark, colors.forest, colors.green]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`rounded-b-3xl px-4 pb-5 pt-2 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}
