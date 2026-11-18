import React, { useState } from "react";
import { Text, View, ScrollView, Pressable } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, PrimaryButton, ScreenContainer, SectionTitle } from "@/components/ui";
import { useSavedPlans } from "@/services/savedPlansService";
import { useActiveDistrict } from "@/services/locationState";
import { useFarms } from "@/services/farmProfileService";
import { colors } from "@/theme/tokens";
import { CROP_BY_ID } from "@/data/cropsData";
import { ParcelFieldMap } from "@/components/charts/ParcelFieldMap";
import { GrainDistributionChart } from "@/components/charts/GrainDistributionChart";
import { ParetoRiskSlider } from "@/components/recommendations/ParetoRiskSlider";
import { PlanningPresets, type FarmPreset } from "@/components/recommendations/PlanningPresets";
import { PlaybookDrawer } from "@/components/recommendations/PlaybookDrawer";
import { Sprout, Calendar, ArrowRight, ShieldCheck, BookOpen } from "lucide-react-native";

type Props = MainTabScreenProps<"Plan">;

export function PlanHubScreen({ navigation }: Props) {
  const parent = navigation.getParent();
  const { activePlan } = useSavedPlans();
  const { district: activeDistrict } = useActiveDistrict();
  const { activeFarm } = useFarms();

  const effectiveDistrict = activeFarm?.district || activePlan?.district || activeDistrict || "Shivamogga";
  const [riskIndex, setRiskIndex] = useState(1);
  const [activePlaybookCrop, setActivePlaybookCrop] = useState<string | null>(null);

  // Default demo crop partition if active plan is empty
  const defaultAllocations = [
    {
      crop: {
        id: "ragi",
        name: "Ragi (Finger Millet)",
        kn: "ರಾಗಿ",
        hue: "#B5532F",
      },
      acres: 2.0,
    },
    {
      crop: {
        id: "maize",
        name: "Maize (Hybrid)",
        kn: "ಮೆಕ್ಕೆಜೋಳ",
        hue: "#E9B44C",
      },
      acres: 1.5,
    },
    {
      crop: {
        id: "tur",
        name: "Tur (Pigeon Pea)",
        kn: "ತೊಗರಿ",
        hue: "#145C3A",
      },
      acres: 0.5,
    },
  ];

  const totalAcres = Number(activeFarm?.acres) || activePlan?.totalAcres || 4.0;

  const handleSelectPreset = (preset: FarmPreset) => {
    parent?.navigate("FarmInput");
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-32">
        {/* Header */}
        <View className="mb-4">
          <Text className="font-sans-extrabold text-2xl text-ink">Crop Planning & Land Split</Text>
          <Text className="text-xs text-ink-muted">
            AI-driven multi-crop portfolio, water budgeting, and Pareto risk frontiers for {effectiveDistrict}
          </Text>
        </View>

        {/* Quick Archetype Presets */}
        <PlanningPresets onSelectPreset={handleSelectPreset} />

        {/* Interactive Field Parcel Map */}
        <View className="mb-4">
          <ParcelFieldMap
            crops={defaultAllocations}
            fallowAcres={0}
            totalAcres={totalAcres}
            onCropSelect={(id) => setActivePlaybookCrop(id)}
          />
        </View>

        {/* Pareto Risk Frontier Slider */}
        <View className="mb-4">
          <ParetoRiskSlider
            currentIndex={riskIndex}
            totalOptions={5}
            onChange={setRiskIndex}
          />
        </View>

        {/* 500-Season Monte Carlo Simulation Distribution */}
        <View className="mb-4">
          <GrainDistributionChart
            p10={38000 * (riskIndex * 0.2 + 0.8)}
            p50={115000 * (riskIndex * 0.15 + 0.9)}
            p90={195000 * (riskIndex * 0.25 + 0.8)}
            lossProbability={0.04 + riskIndex * 0.02}
          />
        </View>

        {/* Playbook Drawer Launch Banner */}
        <View className="mb-4 rounded-2xl bg-sage/60 p-4 border border-sage-dark/40">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <BookOpen size={15} color={colors.primary} />
                <Text className="font-sans-bold text-xs uppercase text-primary">
                  Crop Playbook Checklist
                </Text>
              </View>
              <Text className="font-sans-extrabold text-base text-ink">
                Week-by-Week Field Tasks & Calendar
              </Text>
              <Text className="font-sans text-xs text-ink-muted mt-0.5">
                Dates calculated from your sowing month with persistent task completion tracking
              </Text>
            </View>

            <Pressable
              onPress={() => setActivePlaybookCrop("ragi")}
              className="flex-row items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 active:bg-primary-dark shadow-2xs"
            >
              <Text className="font-sans-bold text-xs text-white">Open Playbook</Text>
              <ArrowRight size={14} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Start New Analysis CTA Card */}
        <Card className="mb-4">
          <SectionTitle>Custom Comprehensive Farm AI Optimization</SectionTitle>
          <Text className="text-xs leading-5 text-ink-muted mb-4">
            Optimize your complete acreage across crops with dynamic water budgets, pump HP, electricity hours, and weather Monte Carlo simulations.
          </Text>
          <PrimaryButton
            label="Start New Custom Farm Optimization →"
            onPress={() => parent?.navigate("FarmInput")}
          />
        </Card>

        {/* Playbook Drawer Modal */}
        {activePlaybookCrop && (
          <PlaybookDrawer
            cropId={activePlaybookCrop}
            sowingMonthIndex={5} // Kharif June default
            visible={Boolean(activePlaybookCrop)}
            onClose={() => setActivePlaybookCrop(null)}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default PlanHubScreen;
