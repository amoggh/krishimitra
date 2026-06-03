import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { RootStackScreenProps } from "@/types/navigation";
import {
  Card,
  PrimaryButton,
  ScreenContainer,
  SectionTitle,
} from "@/components/ui";
import { LandDivisionBar } from "@/components/recommendations/LandDivisionBar";
import { CropRecommendationCard } from "@/components/recommendations/CropRecommendationCard";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { colors } from "@/theme/colors";

type Props = RootStackScreenProps<"Recommendations">;

export function RecommendationsScreen({ navigation, route }: Props) {
  const { result } = route.params;

  return (
    <ScreenContainer>
      <LinearGradient
        colors={[colors.forest, colors.green]}
        className="-mx-4 mb-4 rounded-b-3xl px-4 pb-5 pt-4"
      >
        <Text className="text-xs text-white/85">{result.season} · Optimized plan</Text>
        <Text className="font-sans-extrabold text-3xl text-white">
          ₹{(result.profit_inr.low / 100000).toFixed(1)}L – ₹
          {(result.profit_inr.high / 100000).toFixed(1)}L
        </Text>
        <Text className="text-xs text-white/90">Expected net profit (90% confidence)</Text>
        <View className="mt-3 flex-row items-center gap-2">
          <Text className="text-xs text-white/90">Confidence</Text>
          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <View
              className="h-full rounded-full bg-green-light"
              style={{ width: `${result.confidence_pct}%` }}
            />
          </View>
          <Text className="text-xs font-sans-bold text-white">{result.confidence_pct}%</Text>
        </View>
      </LinearGradient>

      <SectionTitle>Land division</SectionTitle>
      <LandDivisionBar division={result.land_division} />

      {result.crops.map((crop, i) => (
        <CropRecommendationCard
          key={crop.crop}
          crop={crop}
          accent={i === 0 ? "green" : "earth"}
        />
      ))}

      <Card>
        <SectionTitle>Profit forecast</SectionTitle>
        <MiniBarChart
          data={[40, 55, 70, 85, 75]}
          height={64}
          barColor={colors.earthSoft}
        />
        <Text className="text-xs text-ink-muted">Shaded band = 90% confidence interval</Text>
      </Card>

      <SectionTitle>Why this plan?</SectionTitle>
      <View className="mb-4 rounded-xl bg-green-pale p-3">
        <Text className="text-xs leading-5 text-ink-muted">{result.explanation}</Text>
      </View>

      <Pressable onPress={() => navigation.navigate("RiskAnalysis", { planId: result.plan_id })}>
        <Text className="mb-3 text-center font-sans-semibold text-sm text-forest">
          View full risk analysis →
        </Text>
      </Pressable>

      <PrimaryButton label="Save & share plan" onPress={() => navigation.navigate("Main")} />
    </ScreenContainer>
  );
}
