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
import { useSavedPlans } from "@/services/savedPlansService";
import { useActiveDistrict } from "@/services/locationState";
import { getDistrictProfile } from "@/constants/districtProfiles";
import { mockDashboard, mockRecommendation } from "@/data/mockData";
import type { DashboardSummary } from "@/types/api";

type Props = MainTabScreenProps<"Home">;

export function HomeScreen({ navigation }: Props) {
  const [dashboard, setDashboard] = useState<DashboardSummary>(mockDashboard);
  const { plans: savedPlans } = useSavedPlans();
  const { district: activeDistrict } = useActiveDistrict();

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(mockDashboard));
  }, []);

  // Use the most recently saved recommendation plan if available
  const latestSavedPlan = savedPlans.length > 0 ? savedPlans[0] : null;
  const recommendation =
    latestSavedPlan?.result ?? dashboard.active_recommendation ?? mockRecommendation;
  const recentDateLabel = latestSavedPlan?.formattedDate;
  const planTitle = latestSavedPlan?.title;

  // Dynamically resolve district and profile from recent selection or saved plan
  const effectiveDistrict = activeDistrict || latestSavedPlan?.district || "Mandya";
  const profile = getDistrictProfile(effectiveDistrict);

  return (
    <View className="flex-1 bg-cream">
      <GradientHeader>
        <Text className="text-xs text-white/85">Namaste</Text>
        <Text className="font-sans-extrabold text-xl text-white">{dashboard.farmer.name}</Text>
        <Text className="text-xs text-white/75">
          {profile.location} · {dashboard.farmer.acres} acres
        </Text>
      </GradientHeader>
      <ScreenContainer safe={false} className="px-4 pt-4">
        <WeatherWidget weather={profile.weather} />
        <View className="mb-3 flex-row gap-2.5">
          <SoilSummaryCard
            type={profile.soil.type}
            ph={profile.soil.ph}
            npk={profile.soil.npk}
          />
          <WaterBudgetCard litresPerAcre={profile.water_budget_litres_per_acre} />
        </View>
        <FarmLocationMap
          latitude={profile.coordinates.lat}
          longitude={profile.coordinates.lon}
          title={`${effectiveDistrict} Farm`}
        />
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
        <Pressable
          onPress={() =>
            navigation
              .getParent()
              ?.navigate("Recommendations", { result: recommendation })
          }
        >
          <RecentRecommendationCard
            recommendation={recommendation}
            dateLabel={recentDateLabel}
            planTitle={planTitle}
          />
        </Pressable>
        <SectionTitle>Market trends · {effectiveDistrict} mandi</SectionTitle>
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
