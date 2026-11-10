import React from "react";
import { View, Text, type ViewProps } from "react-native";
import {
  MapPin,
  Sun,
  CloudSun,
  CloudRain,
  Cloud,
  Droplets,
  Wind,
  Gauge,
  Sunrise,
  Sunset,
} from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type WeatherDetailCardProps = ViewProps & {
  location: string;
  tempC: number;
  condition?: string;
  highC?: number;
  lowC?: number;
  humidityPct?: number;
  precipitationMm?: number;
  pressureHpa?: number;
  windSpeedKmh?: number;
  sunrise?: string;
  sunset?: string;
  className?: string;
};

function getWeatherGraphic(condition: string = "sunny") {
  const lower = condition.toLowerCase();
  if (lower.includes("rain")) {
    return <CloudRain size={36} color={colors.info} />;
  }
  if (lower.includes("cloud")) {
    return <CloudSun size={36} color={colors.accent} />;
  }
  return <Sun size={36} color={colors.accent} />;
}

export function WeatherDetailCard({
  location,
  tempC,
  condition = "Partly Cloudy",
  highC = tempC + 4,
  lowC = tempC - 6,
  humidityPct = 65,
  precipitationMm = 0,
  pressureHpa = 1012,
  windSpeedKmh = 14,
  sunrise = "5:45 am",
  sunset = "6:15 pm",
  className = "",
  style,
  ...rest
}: WeatherDetailCardProps) {
  return (
    <View
      className={`mb-3.5 bg-white p-4 ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.card,
          borderWidth: 1,
          borderColor: "rgba(24, 59, 43, 0.06)",
        },
        style,
      ]}
      {...rest}
    >
      {/* Top Location Row */}
      <View className="flex-row items-center gap-1.5">
        <MapPin size={14} color={colors.primary} />
        <Text className="font-sans-bold text-xs text-ink tracking-tight">
          {location}
        </Text>
      </View>

      {/* Main Temperature & Weather Illustration */}
      <View className="my-2.5 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-extrabold text-4xl text-ink tracking-tight">
            {tempC > 0 ? `+${tempC}` : `${tempC}`}°C
          </Text>
          <Text className="font-sans-medium text-xs text-ink-muted">
            H: {highC}°C  ·  L: {lowC}°C
          </Text>
        </View>

        <View className="items-center justify-center p-2">
          {getWeatherGraphic(condition)}
          <Text className="mt-1 font-sans-semibold text-[11px] text-ink-muted">
            {condition}
          </Text>
        </View>
      </View>

      {/* 4-Metric Grid (Matches Reference Screen 1) */}
      <View className="my-2 flex-row items-center justify-between rounded-xl bg-cream p-2.5">
        <View className="items-center flex-1">
          <Text className="font-sans-medium text-[10px] text-ink-muted">Humidity</Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-ink">{humidityPct}%</Text>
        </View>
        <View className="h-6 w-[1px] bg-cream-muted" />
        <View className="items-center flex-1">
          <Text className="font-sans-medium text-[10px] text-ink-muted">Rain</Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-ink">{precipitationMm} mm</Text>
        </View>
        <View className="h-6 w-[1px] bg-cream-muted" />
        <View className="items-center flex-1">
          <Text className="font-sans-medium text-[10px] text-ink-muted">Pressure</Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-ink">{pressureHpa} hpa</Text>
        </View>
        <View className="h-6 w-[1px] bg-cream-muted" />
        <View className="items-center flex-1">
          <Text className="font-sans-medium text-[10px] text-ink-muted">Wind</Text>
          <Text className="mt-0.5 font-sans-bold text-xs text-ink">{windSpeedKmh} km/h</Text>
        </View>
      </View>

      {/* Sunrise & Sunset Arc (Matches Reference Screen 1) */}
      <View className="mt-2.5 flex-row items-center justify-between pt-2 border-t border-cream-muted/60">
        <View className="flex-row items-center gap-1.5">
          <Sunrise size={14} color={colors.accent} />
          <View>
            <Text className="font-sans-bold text-[11px] text-ink">{sunrise}</Text>
            <Text className="font-sans text-[9px] text-ink-muted">Sunrise</Text>
          </View>
        </View>

        <View className="flex-1 mx-3 items-center">
          <View className="h-[2px] w-full bg-gold/40 border-dashed" />
          <View className="-mt-1 h-2 w-2 rounded-full bg-gold" />
        </View>

        <View className="flex-row items-center gap-1.5">
          <Sunset size={14} color={colors.accent} />
          <View className="items-end">
            <Text className="font-sans-bold text-[11px] text-ink">{sunset}</Text>
            <Text className="font-sans text-[9px] text-ink-muted">Sunset</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default WeatherDetailCard;

