import React from "react";
import { View, Text, type ViewProps } from "react-native";
import {
  Sun,
  CloudSun,
  CloudRain,
  Cloud,
  Droplets,
  MapPin,
  Calendar,
} from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type WeatherHeroCardProps = ViewProps & {
  location: string;
  dateStr?: string;
  tempC: number;
  condition: string;
  humidityPct: number;
  advisoryText?: string;
  className?: string;
};

function getWeatherIcon(condition: string, color: string, size = 32) {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("shower")) {
    return <CloudRain size={size} color={color} />;
  }
  if (lower.includes("cloud") || lower.includes("overcast")) {
    return <Cloud size={size} color={color} />;
  }
  if (lower.includes("partly") || lower.includes("scattered")) {
    return <CloudSun size={size} color={color} />;
  }
  return <Sun size={size} color={color} />;
}

export function WeatherHeroCard({
  location,
  dateStr = "Today",
  tempC,
  condition,
  humidityPct,
  advisoryText = "Good conditions for farm field activities today.",
  className = "",
  style,
  ...rest
}: WeatherHeroCardProps) {
  return (
    <View
      className={`overflow-hidden bg-primary p-4 text-white ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.elevated,
          shadowColor: colors.primaryDark,
        },
        style,
      ]}
      {...rest}
    >
      {/* Top Location & Date */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={14} color="rgba(255, 255, 255, 0.85)" />
          <Text className="font-sans-medium text-xs text-white/90">
            {location} · {dateStr}
          </Text>
        </View>
      </View>

      {/* Main Temperature & Weather Graphic */}
      <View className="my-3 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-extrabold text-4xl text-white tracking-tight">
            {tempC > 0 ? `+${tempC}` : `${tempC}`}°C
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Droplets size={12} color="rgba(255, 255, 255, 0.8)" />
            <Text className="font-sans-medium text-xs text-white/80">
              Humidity {humidityPct}%
            </Text>
          </View>
        </View>

        {/* Condition Graphic and Label */}
        <View className="items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            {getWeatherIcon(condition, colors.accent, 28)}
          </View>
          <Text className="mt-1 font-sans-semibold text-xs text-white/90">
            {condition}
          </Text>
        </View>
      </View>

      {/* Advisory Banner Pill (Screen 3 style) */}
      {advisoryText ? (
        <View className="mt-1 rounded-xl bg-black/20 px-3.5 py-2.5 backdrop-blur-sm">
          <Text className="font-sans-medium text-xs leading-4 text-white/95">
            {advisoryText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default WeatherHeroCard;

