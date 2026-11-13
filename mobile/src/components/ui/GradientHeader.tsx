import React from "react";
import { View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "@/theme/tokens";

export type GradientHeaderProps = ViewProps & {
  children: React.ReactNode;
  className?: string;
};

export function GradientHeader({ children, className = "", style, ...rest }: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        {
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        },
        style,
      ]}
      {...rest}
    >
      <SafeAreaView edges={["top"]}>
        <View className={`px-4 pb-5 pt-2 ${className}`}>
          {children}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default GradientHeader;
