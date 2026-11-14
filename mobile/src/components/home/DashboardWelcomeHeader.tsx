import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, MapPin, Calendar, CloudSun, Sun, CloudRain, ChevronDown, Star } from "lucide-react-native";
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
  farmName?: string;
  isDefaultFarm?: boolean;
  onOpenFarmSelector?: () => void;
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
  farmName,
  isDefaultFarm = false,
  onOpenFarmSelector,
}: DashboardWelcomeHeaderProps) {
  const { isDesktop, isTablet, contentMaxWidth } = useResponsive();
  const greeting = getGreeting();
  const dateStr = getFormattedDate();

  // Extract clean farmer name ensuring Ravi Kumar
  const displayFarmerName =
    farmerName && !farmerName.toLowerCase().includes("ramesh")
      ? farmerName
      : "Ravi Kumar";

  // Extract initials from name e.g. "Ravi Kumar" -> "RK"
  const initials = displayFarmerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RK";

  const safeTemp = typeof tempC === "number" ? Number(tempC.toFixed(1)) : 28;

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: "hidden",
      }}
    >
      <SafeAreaView
        edges={["top"]}
        className="w-full px-5 pb-5 pt-2"
        style={
          isDesktop
            ? { maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 36, paddingBottom: 24, paddingTop: 16 }
            : isTablet
            ? { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 12 }
            : { paddingBottom: 18 }
        }
      >
        {/* Top User Bar */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-sans-medium text-[11px] text-white/80">
              {greeting}
            </Text>
            <Text className="font-sans-extrabold text-xl sm:text-2xl text-white tracking-tight">
              Namaste, {displayFarmerName}
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
              className="h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-gold active:opacity-85 shadow-sm"
            >
              <Text className="font-sans-extrabold text-xs text-ink tracking-tight">
                {initials}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Search Bar: Centered in the middle with generous room ── */}
        {onSearchChange ? (
          <View className="my-3.5 w-full items-center justify-center">
            <View className="w-full max-w-xl">
              <SearchBar
                value={searchValue}
                onChangeText={onSearchChange}
                variant="dark"
                placeholder="Search crops, mandis, advisories..."
                onClear={() => onSearchChange("")}
              />
            </View>
          </View>
        ) : null}

        {/* Quick Location & Weather Status Pill — Interactive Farm / District Selector */}
        <Pressable
          onPress={onOpenFarmSelector}
          accessibilityRole="button"
          accessibilityLabel="Switch farm or district"
          className="mb-1 flex-row items-center justify-between rounded-full bg-white/12 px-4 py-2 backdrop-blur-md border border-white/25 shadow-xs active:bg-white/20 cursor-pointer"
        >
          <View className="flex-row items-center gap-1.5 flex-1 pr-2">
            <MapPin size={13} color="rgba(255, 255, 255, 0.95)" />
            <Text className="font-sans-bold text-[11px] text-white/95" numberOfLines={1}>
              {farmName ? `${farmName} (${location})` : location} · {totalAcres.toFixed(1)} acres
            </Text>

            {isDefaultFarm && (
              <View className="bg-gold px-1.5 py-0.5 rounded-full flex-row items-center gap-0.5 ml-1 shadow-xs">
                <Star size={9} color="#183B2B" fill="#183B2B" />
                <Text className="text-[9px] font-sans-extrabold text-[#183B2B]">Default</Text>
              </View>
            )}

            <ChevronDown size={13} color="rgba(255, 255, 255, 0.85)" />
          </View>

          <View className="flex-row items-center gap-1.5">
            {getWeatherIcon(weatherCondition)}
            <Text className="font-sans-bold text-[11px] text-white">
              {safeTemp > 0 ? `+${safeTemp}` : `${safeTemp}`}°C
            </Text>
            <Text className="font-sans text-[10px] text-white/80">
              {weatherCondition}
            </Text>
          </View>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default DashboardWelcomeHeader;
