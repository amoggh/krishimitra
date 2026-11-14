import React from "react";
import { View, Text, Pressable } from "react-native";
import { Home, Sprout, TrendingUp, ScanLine, Bot, User } from "lucide-react-native";
import { colors, shadows } from "@/theme/tokens";

export type TabletNavRailProps = {
  currentRoute: string;
  onNavigate: (route: string, isStack?: boolean) => void;
  farmerName?: string;
  className?: string;
};

const RAIL_ITEMS = [
  { key: "Home", label: "Home", icon: Home, route: "Home" },
  { key: "Plan", label: "Plan", icon: Sprout, route: "Plan" },
  { key: "Market", label: "Market", icon: TrendingUp, route: "Market" },
  { key: "Disease", label: "Scan", icon: ScanLine, route: "DiseaseDetection", isStack: true },
  { key: "Chatbot", label: "Krishi AI", icon: Bot, route: "Chatbot", isStack: true },
  { key: "Profile", label: "Profile", icon: User, route: "Profile" },
];

export function TabletNavRail({
  currentRoute,
  onNavigate,
  farmerName = "RP",
  className = "",
}: TabletNavRailProps) {
  const initials = farmerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RP";

  return (
    <View
      className={`h-full w-[80px] flex-col justify-between items-center py-5 bg-white border-r border-[#183B2B]/[0.08] ${className}`}
      style={{ ...shadows.subtle }}
    >
      {/* Top Logo */}
      <View className="items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-xs mb-6">
          <Sprout size={22} color={colors.accent} strokeWidth={2.4} />
        </View>

        {/* Rail Items */}
        <View className="gap-4 items-center">
          {RAIL_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected =
              currentRoute.toLowerCase() === item.key.toLowerCase() ||
              currentRoute.toLowerCase() === item.route.toLowerCase();

            return (
              <Pressable
                key={item.key}
                onPress={() => onNavigate(item.route, item.isStack)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                className="items-center justify-center"
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl ${
                    isSelected ? "bg-sage border border-sage-dark/60" : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                    strokeWidth={isSelected ? 2.4 : 1.8}
                  />
                </View>
                <Text
                  className={`mt-1 font-sans text-[10px] ${
                    isSelected ? "font-sans-bold text-primary" : "text-ink-muted"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bottom Profile Avatar */}
      <Pressable
        onPress={() => onNavigate("Profile", false)}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        className="h-10 w-10 items-center justify-center rounded-full bg-gold border border-gold/40 shadow-xs active:opacity-80"
      >
        <Text className="font-sans-extrabold text-xs text-ink">{initials}</Text>
      </Pressable>
    </View>
  );
}

export default TabletNavRail;

