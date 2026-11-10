import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, MapPin, Calendar, CloudSun, Sun, CloudRain } from "lucide-react-native";
import { CircularIconButton, SearchBar } from "@/components/ui";
import { useResponsive } from "@/theme/responsive";
import { colors } from "@/theme/tokens";

export type DashboardWelcomeHeaderProps = {
  farmerName: string;
  location: string;
  totalAcres: number;
  tempC?: number;
  weatherCondition?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  hasNotification?: boolean;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Hello, Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getFormattedDate(): string {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  return date.toLocaleDateString("en-IN", options);
}

function getWeatherIcon(cond: string = "sunny") {
  const lower = cond.toLowerCase();
  if (lower.includes("rain")) return <CloudRain size={15} color={colors.accent} />;
  if (lower.includes("cloud")) return <CloudSun size={15} color={colors.accent} />;
  return <Sun size={15} color={colors.accent} />;
}

export function DashboardWelcomeHeader({
  farmerName,
  location,
  totalAcres,
  tempC = 32,
  weatherCondition = "Cloudy",
  searchValue = "",
  onSearchChange,
  onProfilePress,
  onNotificationPress,
  hasNotification = true,
}: DashboardWelcomeHeaderProps) {
  const { isDesktop, isTablet, contentMaxWidth } = useResponsive();
  const greeting = getGreeting();
  const dateStr = getFormattedDate();

  // Extract initials from name e.g. "Ramesh Patel" -> "RP"
  const initials = farmerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RP";

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderBottomLeftRadius: isDesktop ? 0 : 24,
        borderBottomRightRadius: isDesktop ? 0 : 24,
      }}
    >
      <SafeAreaView
        edges={["top"]}
        className="w-full px-4 pb-4 pt-1"
        style={isDesktop ? { maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 32 } : isTablet ? { paddingHorizontal: 24 } : {}}
      >
        {/* Top User Bar */}
        <View className="mb-2.5 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-sans-medium text-[11px] text-white/80">
              {greeting}
            </Text>
            <Text className="font-sans-extrabold text-xl sm:text-2xl text-white tracking-tight">
              Namaste, {farmerName}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Calendar size={11} color="rgba(255, 255, 255, 0.75)" />
              <Text className="font-sans text-[11px] text-white/75">{dateStr}</Text>
            </View>
          </View>

          {/* Right Action Icons: Notification Bell & Profile Avatar */}
          <View className="flex-row items-center gap-2">
            <CircularIconButton
              icon={<Bell size={17} color={colors.white} />}
              variant="translucent"
              size={38}
              onPress={onNotificationPress}
              hasNotificationDot={hasNotification}
              accessibilityLabel="Notifications"
            />

            <Pressable
              onPress={onProfilePress}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              className="h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-gold active:opacity-85 shadow-sm"
            >
              <Text className="font-sans-extrabold text-xs text-ink tracking-tight">
                {initials}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Location & Weather Status Pill */}
        <View className="mb-3 flex-row items-center justify-between rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md">
          <View className="flex-row items-center gap-1.5 flex-1 pr-2">
            <MapPin size={12} color="rgba(255, 255, 255, 0.9)" />
            <Text className="font-sans-bold text-[11px] text-white/95" numberOfLines={1}>
              {location} · {totalAcres.toFixed(1)} acres
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            {getWeatherIcon(weatherCondition)}
            <Text className="font-sans-bold text-[11px] text-white">
              {tempC > 0 ? `+${tempC}` : `${tempC}`}°C
            </Text>
            <Text className="font-sans text-[10px] text-white/80">
              {weatherCondition}
            </Text>
          </View>
        </View>

        {/* Search Bar matching Reference Screen 1 */}
        {onSearchChange ? (
          <SearchBar
            value={searchValue}
            onChangeText={onSearchChange}
            variant="dark"
            placeholder="Search crops, mandis, advisories..."
            onClear={() => onSearchChange("")}
          />
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

export default DashboardWelcomeHeader;
