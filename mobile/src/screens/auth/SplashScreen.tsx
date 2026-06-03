import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/types/navigation";
import { colors } from "@/theme/colors";
import { APP_NAME } from "@/constants/config";

type Props = NativeStackScreenProps<AuthStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace("Login"), 2200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={[colors.forestDark, colors.forest, "#1a6b42"]}
      className="flex-1 items-center justify-center px-8"
    >
      <View className="mb-6 h-22 w-22 items-center justify-center rounded-3xl bg-white/15">
        <Text className="text-5xl">🌿</Text>
      </View>
      <Text className="font-sans-extrabold text-3xl text-white">{APP_NAME}</Text>
      <Text className="mt-2 text-center text-sm text-white/85">
        Smart crop decisions for every kisan
      </Text>
      <Text className="mt-1 text-xs text-white/60">AI + Agronomy + Real Indian Data</Text>
      <ActivityIndicator color="#fff" className="mt-12" />
    </LinearGradient>
  );
}
