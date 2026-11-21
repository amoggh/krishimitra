import React, { useState, useEffect } from "react";
import { View, Text, type ViewProps } from "react-native";
import {
  MapPin,
  Sun,
  Moon,
  CloudMoon,
  CloudSun,
  CloudRain,
  Cloud,
  Droplets,
  Wind,
  Gauge,
  Sunrise,
  Sunset,
  Clock,
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
  isNight?: boolean;
  className?: string;
};

// Helper to parse time strings like "06:30 am", "5:56 pm" into minutes from midnight
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toLowerCase();
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getWeatherGraphic(condition: string = "sunny", isNight: boolean = false) {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("shower") || lower.includes("thunder")) {
    return <CloudRain size={36} color={colors.info} />;
  }
  if (lower.includes("cloud") || lower.includes("overcast")) {
    return isNight ? (
      <CloudMoon size={36} color="#E9B44C" />
    ) : (
      <CloudSun size={36} color={colors.accent} />
    );
  }
  if (isNight) {
    return <Moon size={36} color="#E9B44C" />;
  }
  return <Sun size={36} color={colors.accent} />;
}

export function WeatherDetailCard({
  location,
  tempC,
  condition = "Partly Cloudy",
  highC,
  lowC,
  humidityPct = 65,
  precipitationMm = 0,
  pressureHpa = 1012,
  windSpeedKmh = 14,
  sunrise = "06:15 am",
  sunset = "06:00 pm",
  isNight,
  className = "",
  style,
  ...rest
}: WeatherDetailCardProps) {
  // Live local time tracking (updates every 5 seconds for immediate real-time synchronization)
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Format temperatures to 1 decimal place to prevent floating-point precision leaks
  const safeTemp = typeof tempC === "number" ? Number(tempC.toFixed(1)) : 28;
  const safeHigh = typeof highC === "number" ? Number(highC.toFixed(1)) : Number((safeTemp + 4).toFixed(1));
  const safeLow = typeof lowC === "number" ? Number(lowC.toFixed(1)) : Number((safeTemp - 6).toFixed(1));

  // Determine current time in minutes and sunrise/sunset boundaries
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const riseMinutes = parseTimeToMinutes(sunrise) ?? (6 * 60 + 30);
  const setMinutes = parseTimeToMinutes(sunset) ?? (17 * 60 + 56);

  // Check if night strictly and dynamically against local device clock and sunrise/sunset
  const isNightTime = (currentMinutes < riseMinutes || currentMinutes >= setMinutes);

  // Calculate day progress percentage for the sunrise-to-sunset indicator:
  // - If before sunrise: progress is 0% (dot stops at sunrise on the left)
  // - If during daylight (between sunrise and sunset): progress moves smoothly from 0% to 100%
  // - If after sunset: progress stops at 100% (dot stops right at sunset on the right)
  let dayProgressPct = 0;
  if (currentMinutes <= riseMinutes) {
    dayProgressPct = 0;
  } else if (currentMinutes >= setMinutes) {
    dayProgressPct = 100;
  } else {
    dayProgressPct = Math.min(100, Math.max(0, ((currentMinutes - riseMinutes) / (setMinutes - riseMinutes)) * 100));
  }

  // Format subtle current time display (e.g. "07:09 PM")
  const formattedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Adapt condition label for night (e.g. "Clear Sky" -> "Clear Night" when dark)
  let displayCondition = condition;
  const lowerCond = condition.toLowerCase();
  if (isNightTime && (lowerCond === "clear sky" || lowerCond === "clear" || lowerCond === "sunny")) {
    displayCondition = "Clear Night";
  } else if (!isNightTime && lowerCond === "clear night") {
    displayCondition = "Clear Sky";
  }

  return (
    <View
      className={`mb-3.5 bg-white p-4 ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.card,
          borderWidth: 1,
          borderColor: "rgba(24, 59, 43, 0.08)",
        },
        style,
      ]}
      {...rest}
    >
      {/* Top Location & Subtle Current Time Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 flex-1 pr-2">
          <MapPin size={14} color={colors.primary} />
          <Text className="font-sans-bold text-xs text-ink tracking-tight" numberOfLines={1}>
            {location}
          </Text>
        </View>

        {/* Subtle Live Local Time + Day/Night Indicator */}
        <View className="flex-row items-center gap-1.5 rounded-full bg-cream/80 px-2.5 py-0.5 border border-primary/5">
          <Clock size={11} color={colors.textMuted} />
          <Text className="font-sans-medium text-[10px] text-ink-muted">
            {formattedTime} · {isNightTime ? "Night 🌙" : "Day ☀️"}
          </Text>
        </View>
      </View>

      {/* Main Temperature & Weather Illustration */}
      <View className="my-2.5 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-extrabold text-4xl text-ink tracking-tight">
            {safeTemp > 0 ? `+${safeTemp}` : `${safeTemp}`}°C
          </Text>
          <Text className="font-sans-medium text-xs text-ink-muted">
            H: {safeHigh}°C  ·  L: {safeLow}°C
          </Text>
        </View>

        <View className="items-center justify-center p-2">
          {getWeatherGraphic(condition, isNightTime)}
          <Text className="mt-1 font-sans-semibold text-[11px] text-ink-muted">
            {displayCondition} {isNightTime ? "🌙" : "☀️"}
          </Text>
        </View>
      </View>

      {/* 4-Metric Grid */}
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

      {/* Sunrise & Sunset Arc with moving sun/moon indicator dot */}
      <View className="mt-2.5 flex-row items-center justify-between pt-2 border-t border-cream-muted/60">
        <View className="flex-row items-center gap-1.5">
          <Sunrise size={14} color={colors.accent} />
          <View>
            <Text className="font-sans-bold text-[11px] text-ink">{sunrise}</Text>
            <Text className="font-sans text-[9px] text-ink-muted">Sunrise</Text>
          </View>
        </View>

        {/* Dynamic Daylight Progress Bar */}
        <View className="flex-1 mx-3 justify-center relative py-2">
          {/* Base Background Track (Muted gold) */}
          <View className="h-[2px] w-full bg-gold/25 rounded-full" />

          {/* Active Elapsed Track (Solid gold from start to current position) */}
          <View
            className="absolute left-0 h-[2px] bg-gold rounded-full"
            style={{ width: `${dayProgressPct}%` }}
          />

          {/* Sun / Moon Moving Indicator Dot */}
          <View
            className="absolute -top-[3px] h-3 w-3 rounded-full bg-gold shadow-xs border border-white items-center justify-center"
            style={{
              left: `${dayProgressPct}%`,
              transform: [{ translateX: -6 }],
            }}
          >
            <View className="h-1.5 w-1.5 rounded-full bg-white" />
          </View>
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

