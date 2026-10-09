import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { RootStackScreenProps } from "@/types/navigation";
import { getCropRecommendation } from "@/services/api";
import { mockRecommendation } from "@/data/mockData";
import { colors } from "@/theme/colors";

type Props = RootStackScreenProps<"AIProcessing">;

// These steps mirror the actual pipeline stages in pipeline.py
const STEPS = [
  "Loading soil & weather data",
  "Calculating water budget",
  "Crop compatibility filter",
  "Yield model (requires training data)",
  "Price forecasting (requires mandi data)",
  "Risk simulation (Monte Carlo)",
  "Land allocation optimizer (NSGA-II)",
];

export function AIProcessingScreen({ navigation, route }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setActiveStep(step);
      if (step >= STEPS.length - 1) clearInterval(interval);
    }, 600);

    async function run() {
      try {
        // Direct call — synchronous backend response
        const result = await getCropRecommendation(route.params.farmInput);
        // Ensure farmer sees a couple animation steps then navigate
        setTimeout(() => {
          navigation.replace("Recommendations", { result });
        }, 1200);
      } catch {
        // Fallback to mock data so UI stays resilient if backend is unreachable
        setTimeout(() => {
          navigation.replace("Recommendations", { result: mockRecommendation });
        }, 1500);
      }
    }

    run();
    return () => clearInterval(interval);
  }, [navigation, route.params.farmInput]);

  return (
    <LinearGradient colors={[colors.forestDark, "#0a2818"]} className="flex-1 px-6 pt-16">
      <View className="mb-8 items-center">
        <View className="h-28 w-28 items-center justify-center rounded-full border-2 border-green-light/30">
          <ActivityIndicator size="large" color={colors.greenLight} />
        </View>
      </View>

      <Text className="text-center font-sans-extrabold text-xl text-white">
        Analyzing your farm…
      </Text>
      <Text className="mt-2 text-center text-sm text-white/75">
        Running KrushiMitra optimization pipeline
      </Text>

      <View className="mt-8">
        {STEPS.map((step, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <View key={step} className="mb-3 flex-row items-center gap-3">
              <View
                className={`h-2 w-2 rounded-full ${
                  done || active ? "bg-green-light" : "bg-white/30"
                }`}
              />
              <Text
                className={`text-sm ${
                  active
                    ? "font-sans-bold text-green-light"
                    : done
                    ? "text-white"
                    : "text-white/50"
                }`}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mt-8 text-center text-xs text-white/40">
        {route.params.farmInput.district || "Karnataka"} · Karnataka
      </Text>
    </LinearGradient>
  );
}
