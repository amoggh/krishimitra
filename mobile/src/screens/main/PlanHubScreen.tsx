import { Text, View, ScrollView } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, PrimaryButton, ScreenContainer, SectionTitle } from "@/components/ui";
import { FertilizerRecommendationCard } from "@/components/fertilizer/FertilizerRecommendationCard";

type Props = MainTabScreenProps<"Plan">;

export function PlanHubScreen({ navigation }: Props) {
  const parent = navigation.getParent();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        <Text className="mb-1 font-sans-extrabold text-2xl text-ink">Crop & Nutrient Plan</Text>
        <Text className="mb-5 text-sm text-ink-muted">
          AI land allocation, soil-tailored fertilizer dosages & spray schedules
        </Text>

        {/* 1. Location & Budget-tailored Fertilizer Engine */}
        <FertilizerRecommendationCard />

        {/* 2. Full Farm AI Crop Planning Card */}
        <Card className="mb-4">
          <SectionTitle>Comprehensive Farm AI Optimization</SectionTitle>
          <Text className="text-sm leading-5 text-ink-muted mb-3">
            Optimize your complete acreage across crops with dynamic water budgets, weather simulations, and market profit forecasting.
          </Text>
          <PrimaryButton
            label="Start New Farm Analysis"
            onPress={() => parent?.navigate("FarmInput")}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
