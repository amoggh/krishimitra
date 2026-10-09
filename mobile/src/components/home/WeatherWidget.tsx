import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { WeatherSummary } from "@/types/api";

type Props = { weather: WeatherSummary };

export function WeatherWidget({ weather }: Props) {
  return (
    <LinearGradient
      colors={["#4a90c2", "#2980b9"]}
      style={{
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: "#2980b9",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 3,
      }}
      className="flex-row items-start justify-between p-3.5"
    >
      <View>
        <Text className="text-xs text-white/90">Today · {weather.location}</Text>
        <Text className="font-sans-extrabold text-3xl text-white">{weather.temp_c}°C</Text>
        <Text className="text-xs text-white/90">
          {weather.condition} · Rain {weather.rain_chance_pct}% Fri
        </Text>
      </View>
      <Text className="text-4xl">⛅</Text>
    </LinearGradient>
  );
}
