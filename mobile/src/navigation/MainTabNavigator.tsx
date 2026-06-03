import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import type { MainTabParamList } from "@/types/navigation";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { PlanHubScreen } from "@/screens/main/PlanHubScreen";
import { MarketInsightsScreen } from "@/screens/main/MarketInsightsScreen";
import { ProfileScreen } from "@/screens/main/ProfileScreen";
import { colors } from "@/theme/colors";

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: "🏠",
    Plan: "🌾",
    Market: "📈",
    Profile: "👤",
  };
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[label]}</Text>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.inkLight,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.creamDark,
          paddingBottom: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Plan" component={PlanHubScreen} options={{ title: "Plan" }} />
      <Tab.Screen name="Market" component={MarketInsightsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
