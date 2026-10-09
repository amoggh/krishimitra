import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { GradientHeader, ScreenContainer, SectionTitle } from "@/components/ui";
import { WeatherWidget } from "@/components/home/WeatherWidget";
import { QuickActions } from "@/components/home/QuickActions";
import { SoilSummaryCard, WaterBudgetCard } from "@/components/home/SummaryCards";
import { RecentRecommendationCard } from "@/components/home/RecentRecommendationCard";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { FarmLocationMap } from "@/components/maps/FarmLocationMap";
import { getDashboard } from "@/services/api";
import { mockDashboard, mockRecommendation } from "@/data/mockData";
import type { DashboardSummary } from "@/types/api";

type Props = MainTabScreenProps<"Home">;

export function HomeScreen({ navigation }: Props) {
  const [dashboard, setDashboard] = useState<DashboardSummary>(mockDashboard);

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(mockDashboard));
  }, []);

  const recommendation = dashboard.active_recommendation ?? mockRecommendation;

  return (
    <View className="flex-1 bg-cream">
      <GradientHeader>
        <Text className="text-xs text-white/85">Namaste</Text>
        <Text className="font-sans-extrabold text-xl text-white">{dashboard.farmer.name}</Text>
        <Text className="text-xs text-white/75">
          {dashboard.farmer.location} · {dashboard.farmer.acres} acres
        </Text>
      </GradientHeader>
      <ScreenContainer safe={false} className="px-4 pt-4">
        <WeatherWidget weather={dashboard.weather} />
        <View className="mb-3 flex-row gap-2.5">
          <SoilSummaryCard
            type={dashboard.soil.type}
            ph={dashboard.soil.ph}
            npk={dashboard.soil.npk}
          />
          <WaterBudgetCard litresPerAcre={dashboard.water_budget_litres_per_acre} />
        </View>
        <FarmLocationMap latitude={12.52} longitude={76.89} />
        <SectionTitle>Quick actions</SectionTitle>
        <QuickActions
          actions={[
            {
              id: "plan",
              label: "New Plan",
              emoji: "🌾",
              onPress: () => navigation.getParent()?.navigate("FarmInput"),
            },
            {
              id: "scan",
              label: "Scan Leaf",
              emoji: "🔍",
              onPress: () => navigation.getParent()?.navigate("DiseaseDetection"),
            },
            {
              id: "mandi",
              label: "Mandi",
              emoji: "📊",
              onPress: () => navigation.navigate("Market"),
            },
            { id: "help", label: "Help", emoji: "❓" },
          ]}
        />
        <Pressable onPress={() => navigation.getParent()?.navigate("Recommendations", { result: recommendation })}>
          <RecentRecommendationCard recommendation={recommendation} />
        </Pressable>
        <SectionTitle>Market trends · Mandya mandi</SectionTitle>
        {dashboard.market_trends.map((item) => (
          <View key={item.crop} className="mb-1 flex-row justify-between">
            <Text className="text-sm text-ink">{item.crop}</Text>
            <Text
              className={`font-sans-bold text-sm ${item.change_pct >= 0 ? "text-success" : "text-danger"}`}
            >
              {item.change_pct >= 0 ? "+" : ""}
              {item.change_pct}%
            </Text>
          </View>
        ))}
        <MiniBarChart data={dashboard.market_trends[0]?.trend_7d ?? []} />
      </ScreenContainer>
    </View>
  );
}
