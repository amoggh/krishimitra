import { LinearGradient } from "expo-linear-gradient";
import { type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

export function GradientHeader({ children, className, ...rest }: ViewProps) {
  return (
    <LinearGradient
      colors={[colors.forestDark, colors.forest, colors.green]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      {...rest}
    >
      <SafeAreaView edges={["top"]}>
        <LinearGradient
          colors={["transparent", "transparent"]}
          className={`px-4 pb-6 pt-3 ${className ?? ""}`}
        >
          {children}
        </LinearGradient>
      </SafeAreaView>
    </LinearGradient>
  );
}
