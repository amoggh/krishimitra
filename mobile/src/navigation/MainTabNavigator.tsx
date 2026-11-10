import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Platform } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { Home, Sprout, TrendingUp, User } from "lucide-react-native";
import type { MainTabParamList } from "@/types/navigation";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { PlanHubScreen } from "@/screens/main/PlanHubScreen";
import { MarketInsightsScreen } from "@/screens/main/MarketInsightsScreen";
import { ProfileScreen } from "@/screens/main/ProfileScreen";
import { DesktopSidebar } from "./DesktopSidebar";
import { TabletNavRail } from "./TabletNavRail";
import { useResponsive } from "@/theme/responsive";
import { colors, radii, shadows } from "@/theme/tokens";

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused }: { label: keyof MainTabParamList; focused: boolean }) {
  const activeColor = colors.primary;
  const inactiveColor = colors.textMuted;
  const iconColor = focused ? activeColor : inactiveColor;
  const iconSize = 20;

  let IconComponent = Home;
  if (label === "Plan") IconComponent = Sprout;
  if (label === "Market") IconComponent = TrendingUp;
  if (label === "Profile") IconComponent = User;

  return (
    <View
      className={`items-center justify-center rounded-full px-3 py-1 ${
        focused ? "bg-sage" : "bg-transparent"
      }`}
      style={{ minWidth: 44 }}
    >
      <IconComponent size={iconSize} color={iconColor} strokeWidth={focused ? 2.4 : 1.8} />
    </View>
  );
}

export function MainTabNavigator() {
  const { isDesktop, isTablet } = useResponsive();
  const navigation = useNavigation<any>();

  // Determine currently active tab route
  const currentTab = useNavigationState((state) => {
    if (!state) return "Home";
    const currentRoute = state.routes[state.index];
    if (currentRoute?.name === "Main" && currentRoute.state) {
      const childState = currentRoute.state;
      const idx = typeof childState.index === "number" ? childState.index : 0;
      return (childState.routes as any[])[idx]?.name || "Home";
    }
    return currentRoute?.name || "Home";
  });

  const handleSidebarNavigate = (route: string, isStack?: boolean) => {
    if (isStack) {
      navigation.getParent()?.navigate(route);
    } else {
      navigation.navigate(route);
    }
  };

  return (
    <View className="flex-1 flex-row bg-cream">
      {/* ── Desktop Persistent Left Sidebar ── */}
      {isDesktop ? (
        <DesktopSidebar
          currentRoute={currentTab}
          onNavigate={handleSidebarNavigate}
        />
      ) : isTablet ? (
        /* ── Tablet Compact Navigation Rail ── */
        <TabletNavRail
          currentRoute={currentTab}
          onNavigate={handleSidebarNavigate}
        />
      ) : null}

      {/* ── Main Tab Navigator Content Area ── */}
      <View className="flex-1 h-full">
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              display: isDesktop || isTablet ? "none" : "flex",
              backgroundColor: colors.white,
              borderTopColor: colors.borderLight,
              borderTopWidth: 1,
              height: Platform.OS === "ios" ? 78 : 66,
              paddingTop: 8,
              paddingBottom: Platform.OS === "ios" ? 22 : 8,
              ...shadows.card,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontFamily: "Manrope_600SemiBold",
              marginTop: 2,
            },
            tabBarIcon: ({ focused }) => (
              <TabIcon label={route.name as keyof MainTabParamList} focused={focused} />
            ),
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
          <Tab.Screen name="Plan" component={PlanHubScreen} options={{ title: "Crop Plan" }} />
          <Tab.Screen name="Market" component={MarketInsightsScreen} options={{ title: "Market" }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
        </Tab.Navigator>
      </View>
    </View>
  );
}

export default MainTabNavigator;
