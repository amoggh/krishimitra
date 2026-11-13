import { Text, View, ScrollView } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, PrimaryButton, ScreenContainer, SectionTitle } from "@/components/ui";

type Props = MainTabScreenProps<"Plan">;

export function PlanHubScreen({ navigation }: Props) {
  const parent = navigation.getParent();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        <Text className="mb-1 font-sans-extrabold text-2xl text-ink">Crop Plan</Text>
        <Text className="mb-5 text-sm text-ink-muted">
          AI-optimized land allocation and crop recommendations tailored to your farm
        </Text>

        <Card className="mb-4">
          <SectionTitle>Comprehensive Farm AI Optimization</SectionTitle>
          <Text className="text-sm leading-5 text-ink-muted mb-4">
            Optimize your complete acreage across crops with dynamic water budgets, borewell capacity, weather simulations, and market profit forecasting.
          </Text>
          <PrimaryButton
            label="Start New Farm Analysis"
            onPress={() => parent?.navigate("FarmInput")}
          />
        </Card>

        <Card className="mb-4">
          <SectionTitle>How It Works</SectionTitle>
          <View className="gap-2.5 mt-2">
            <Text className="text-sm leading-5 text-ink">
              <Text className="font-sans-bold text-forest">1. Farm Profile: </Text>
              Enter your land size, soil type, and borewell irrigation details.
            </Text>
            <Text className="text-sm leading-5 text-ink">
              <Text className="font-sans-bold text-forest">2. Hydrological Simulation: </Text>
              AI computes your seasonal water availability using motor HP and electricity schedules.
            </Text>
            <Text className="text-sm leading-5 text-ink">
              <Text className="font-sans-bold text-forest">3. Multi-Crop Allocation: </Text>
              NSGA-II optimizer generates a Pareto-optimal crop portfolio maximizing profit while controlling downside risk.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
