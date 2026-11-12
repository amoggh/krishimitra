import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Sprout, DollarSign, MapPin, Droplets, ShieldCheck, ChevronRight, Check } from "lucide-react-native";
import { colors } from "@/theme/colors";
import {
  fetchFertilizerRecommendation,
  type FertilizerRecommendation,
} from "@/services/api/fertilizerService";
import { useActiveDistrict } from "@/services/locationState";

const CROPS = ["Ragi", "Maize", "Paddy", "Tomato", "Cotton", "Groundnut"];
const BUDGET_TIERS: Array<{ id: "low" | "standard" | "high"; label: string; range: string }> = [
  { id: "low", label: "Low Budget / Organic", range: "₹1,500–₹2,500/ac" },
  { id: "standard", label: "Standard POP", range: "₹3,000–₹5,000/ac" },
  { id: "high", label: "High Yield", range: "₹6,000–₹10,000/ac" },
];

export type FertilizerCalculatorProps = {
  initialCrop?: string;
  initialDistrict?: string;
  initialDisease?: string;
  compact?: boolean;
};

export function FertilizerRecommendationCard({
  initialCrop = "Ragi",
  initialDistrict,
  initialDisease,
  compact = false,
}: FertilizerCalculatorProps) {
  const { district: activeDistrict } = useActiveDistrict();
  const district = initialDistrict || activeDistrict || "Mandya";

  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [budgetTier, setBudgetTier] = useState<"low" | "standard" | "high">("standard");
  const [acres, setAcres] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FertilizerRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFertilizerRecommendation({
        crop: selectedCrop,
        district: district,
        budget_tier: budgetTier,
        acres: acres,
        disease: initialDisease,
      });
      setData(res);
    } catch (e) {
      setError("Failed to load fertilizer recommendations. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendation();
  }, [selectedCrop, budgetTier, acres, district, initialDisease]);

  return (
    <View className="rounded-2xl bg-white p-5 border border-[#183B2B]/10 shadow-sm mb-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-sage">
            <Sprout size={18} color={colors.primary} />
          </View>
          <View>
            <Text className="font-sans-extrabold text-base text-ink">
              Fertilizer & Spray Schedule
            </Text>
            <Text className="text-[11px] font-sans-medium text-ink-muted">
              Location-tailored for {district} soil & your budget
            </Text>
          </View>
        </View>

        {/* Location Badge */}
        <View className="flex-row items-center gap-1 rounded-full bg-cream px-2.5 py-1 border border-cream-muted">
          <MapPin size={11} color={colors.primary} />
          <Text className="font-sans-bold text-[11px] text-ink">{district}</Text>
        </View>
      </View>

      {/* Crop Selector Tabs */}
      <View className="mb-3.5">
        <Text className="font-sans-bold text-[10px] uppercase tracking-wider text-ink-muted mb-1.5">
          Select Crop
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5">
          {CROPS.map((c) => {
            const isSelected = selectedCrop.toLowerCase() === c.toLowerCase();
            return (
              <Pressable
                key={c}
                onPress={() => setSelectedCrop(c)}
                className={`rounded-xl px-3.5 py-2 border active:opacity-85 ${
                  isSelected
                    ? "bg-primary border-primary"
                    : "bg-cream/70 border-cream-muted"
                }`}
              >
                <Text
                  className={`font-sans text-xs ${
                    isSelected ? "font-sans-bold text-white" : "font-sans-medium text-ink"
                  }`}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Budget Selector Tabs */}
      <View className="mb-4">
        <Text className="font-sans-bold text-[10px] uppercase tracking-wider text-ink-muted mb-1.5">
          Select Budget Tier
        </Text>
        <View className="flex-row gap-2">
          {BUDGET_TIERS.map((tier) => {
            const isSelected = budgetTier === tier.id;
            return (
              <Pressable
                key={tier.id}
                onPress={() => setBudgetTier(tier.id)}
                className={`flex-1 rounded-xl p-2.5 border active:opacity-85 ${
                  isSelected
                    ? "bg-sage border-primary/50 shadow-xs"
                    : "bg-white border-[#183B2B]/10"
                }`}
              >
                <Text
                  className={`font-sans text-xs ${
                    isSelected ? "font-sans-bold text-primary" : "font-sans-semibold text-ink"
                  }`}
                  numberOfLines={1}
                >
                  {tier.label}
                </Text>
                <Text className="font-sans text-[10px] text-ink-muted mt-0.5">
                  {tier.range}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Acre Quick Toggle */}
      <View className="mb-4 flex-row items-center justify-between rounded-xl bg-cream p-2.5 border border-cream-muted">
        <Text className="font-sans-bold text-xs text-ink">
          Farm Area: <Text className="font-sans text-ink-muted">{acres} Acre</Text>
        </Text>
        <View className="flex-row gap-1">
          {[1, 2, 5].map((a) => (
            <Pressable
              key={a}
              onPress={() => setAcres(a)}
              className={`rounded-lg px-2.5 py-1 ${
                acres === a ? "bg-primary" : "bg-white border border-cream-muted"
              }`}
            >
              <Text className={`font-sans-bold text-[11px] ${acres === a ? "text-white" : "text-ink"}`}>
                {a} ac
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Loading state */}
      {loading && (
        <View className="py-8 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-2 text-xs font-sans text-ink-muted">
            Calculating soil-tailored schedule...
          </Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View className="rounded-xl bg-red-50 p-3 border border-red-200">
          <Text className="text-xs text-red-700">{error}</Text>
        </View>
      )}

      {/* Recommendation Data Display */}
      {data && !loading && (
        <View className="gap-3">
          {/* Regional Soil Card */}
          <View className="rounded-xl bg-sage/50 p-3 border border-sage-dark/30">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-sans-bold text-xs text-primary">
                {data.district} Soil: {data.soil_type} (pH {data.soil_ph})
              </Text>
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="font-sans-bold text-[10px] text-primary">
                  Est: ₹{data.total_estimated_cost_inr.toLocaleString()}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-ink-muted leading-4 font-sans">
              {data.regional_soil_advisory}
            </Text>
          </View>

          {/* 3 Simple Stages */}
          <Text className="font-sans-bold text-xs text-ink uppercase tracking-wider mt-1">
            Application Schedule (Per Acre)
          </Text>

          {data.stages.map((stage, idx) => (
            <View
              key={idx}
              className="rounded-xl bg-white p-3.5 border border-[#183B2B]/10 shadow-xs"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                    <Text className="font-sans-extrabold text-[10px] text-primary">{idx + 1}</Text>
                  </View>
                  <Text className="font-sans-bold text-xs text-ink">
                    {stage.stage_name}
                  </Text>
                </View>
                <Text className="font-sans-semibold text-[11px] text-primary">
                  ₹{stage.estimated_cost_inr.toLocaleString()}
                </Text>
              </View>

              {/* What to apply in practical bags/kg */}
              <View className="my-1 rounded-lg bg-cream/80 p-2 border border-cream-muted">
                <Text className="font-sans-extrabold text-xs text-primary-dark">
                  📦 {stage.what_to_apply}
                </Text>
              </View>

              <Text className="text-[11px] font-sans text-ink-muted leading-4 mt-1">
                👉 {stage.farmer_instructions}
              </Text>
            </View>
          ))}

          {/* Disease Curative Spray Banner (If disease attached) */}
          {data.pesticide_spray && (
            <View className="rounded-xl bg-red-50 p-3.5 border border-red-200 mt-1">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Text style={{ fontSize: 16 }}>🚨</Text>
                <Text className="font-sans-bold text-xs text-red-900">
                  Curative Spray for {data.pesticide_spray.disease}
                </Text>
              </View>

              {data.pesticide_spray.chemical_spray && (
                <View className="mb-1.5">
                  <Text className="font-sans-bold text-[11px] text-red-950">
                    Chemical Dose:
                  </Text>
                  <Text className="text-xs text-red-900 leading-4 font-sans">
                    {data.pesticide_spray.chemical_spray}
                  </Text>
                </View>
              )}

              {data.pesticide_spray.tank_mixing_dose && (
                <View className="mb-1.5">
                  <Text className="font-sans-bold text-[11px] text-red-950">
                    Backpack Pump Mixing Ratio:
                  </Text>
                  <Text className="text-xs text-red-900 leading-4 font-sans">
                    {data.pesticide_spray.tank_mixing_dose}
                  </Text>
                </View>
              )}

              {data.pesticide_spray.organic_option && (
                <View>
                  <Text className="font-sans-bold text-[11px] text-red-950">
                    Organic Alternative:
                  </Text>
                  <Text className="text-xs text-red-900 leading-4 font-sans">
                    {data.pesticide_spray.organic_option}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Water Tip */}
          <View className="flex-row items-center gap-2 rounded-xl bg-blue-50/70 p-2.5 border border-blue-100">
            <Droplets size={14} color="#0284c7" />
            <Text className="flex-1 text-[11px] text-blue-900 font-sans leading-4">
              {data.water_tip}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default FertilizerRecommendationCard;

