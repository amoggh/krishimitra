import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import {
  Home,
  Sprout,
  TrendingUp,
  ScanLine,
  User,
  Plus,
  MapPin,
  HelpCircle,
  Settings,
  ShieldCheck,
  Bot,
} from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";
import { useActiveDistrict } from "@/services/locationState";
import { useFarms } from "@/services/farmProfileService";

export type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  route: string;
  isStack?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: "Home", label: "Dashboard", icon: Home, route: "Home" },
  { key: "Plan", label: "Crop Planning", icon: Sprout, route: "Plan" },
  { key: "Market", label: "Mandi Insights", icon: TrendingUp, route: "Market" },
  { key: "Disease", label: "Plant Disease AI", icon: ScanLine, route: "DiseaseDetection", isStack: true },
  { key: "Chatbot", label: "Krishi AI Advisor", icon: Bot, route: "Chatbot", isStack: true },
  { key: "Profile", label: "Farmer Profile", icon: User, route: "Profile" },
];

export type DesktopSidebarProps = {
  currentRoute: string;
  onNavigate: (route: string, isStack?: boolean) => void;
  farmerName?: string;
  totalAcres?: number;
  className?: string;
};

export function DesktopSidebar({
  currentRoute,
  onNavigate,
  farmerName = "Ravi Kumar",
  totalAcres = 5.0,
  className = "",
}: DesktopSidebarProps) {
  const { district } = useActiveDistrict();
  const { activeFarm } = useFarms();
  const effectiveDistrict = activeFarm?.district || district || "Shivamogga";
  const effectiveAcres = Number(activeFarm?.acres) || totalAcres;

  const initials = farmerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RK";

  return (
    <View
      className={`h-full w-[260px] flex-col justify-between bg-white border-r border-[#183B2B]/20 ${className}`}
      style={{
        ...shadows.subtle,
      }}
    >
      <View className="flex-1 p-5">
        {/* Brand Logo & Title */}
        <View className="mb-6 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-xs">
            <Sprout size={22} color={colors.accent} strokeWidth={2.4} />
          </View>
          <View>
            <Text className="font-sans-extrabold text-lg text-ink tracking-tight">
              KrishiMitra
            </Text>
            <Text className="font-sans text-[10px] uppercase tracking-wider text-primary font-bold">
              AgriTech Intelligence
            </Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <Pressable
          onPress={() => onNavigate("FarmInput", true)}
          accessibilityRole="button"
          accessibilityLabel="Start new farm plan"
          className="mb-6 flex-row items-center justify-center gap-2 rounded-full bg-primary py-3 px-4 active:bg-primary-dark shadow-sm border border-[#0F4A2C]"
          style={{ cursor: "pointer" as any }}
        >
          <Plus size={16} color={colors.white} strokeWidth={2.5} />
          <Text className="font-sans-bold text-xs text-white">
            New Farm Plan
          </Text>
        </Pressable>

        {/* Navigation Items List */}
        <View className="gap-2">
          <Text className="mb-1 font-sans-bold text-[10px] uppercase tracking-wider text-ink-muted px-3">
            Main Navigation
          </Text>

          {NAV_ITEMS.map((item) => {
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
                style={{ cursor: "pointer" as any }}
                className={`flex-row items-center gap-3 rounded-xl px-3.5 py-2.5 active:opacity-85 border transition-all ${
                  isSelected
                    ? "bg-sage border-[#145C3A]/30 shadow-xs"
                    : "bg-white/60 border-[#183B2B]/12 hover:bg-cream hover:border-[#183B2B]/25"
                }`}
              >
                <Icon
                  size={19}
                  color={isSelected ? colors.primary : colors.textSecondary}
                  strokeWidth={isSelected ? 2.4 : 1.8}
                />
                <Text
                  className={`font-sans text-xs tracking-tight ${
                    isSelected ? "font-sans-bold text-primary" : "font-sans text-ink"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer Area: Location Indicator & Profile Summary */}
      <View className="border-t border-[#183B2B]/15 p-4">
        {/* Active District & Farm Pill */}
        <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-cream px-3 py-2 border border-[#183B2B]/15 shadow-xs">
          <MapPin size={14} color={colors.primary} />
          <View className="flex-1">
            <Text className="font-sans text-[10px] text-ink-muted" numberOfLines={1}>
              {activeFarm?.name || "Active Farm"}
            </Text>
            <Text className="font-sans-bold text-[11px] text-ink">
              {effectiveDistrict} · {effectiveAcres.toFixed(1)} ac
            </Text>
          </View>
        </View>

        {/* Profile User Card */}
        <Pressable
          onPress={() => onNavigate("Profile", false)}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={{ cursor: "pointer" as any }}
          className="flex-row items-center gap-2.5 rounded-xl bg-sage/60 p-2.5 active:bg-sage border border-[#145C3A]/25 shadow-xs"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-gold">
            <Text className="font-sans-extrabold text-xs text-ink">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-sans-bold text-xs text-ink" numberOfLines={1}>
              {farmerName}
            </Text>
            <Text className="font-sans text-[10px] text-ink-muted">
              {totalAcres.toFixed(1)} acres · Active
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default DesktopSidebar;
