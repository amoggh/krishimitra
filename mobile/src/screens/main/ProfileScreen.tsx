import { Alert, Platform, Pressable, Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, GradientHeader, ScreenContainer, SectionTitle } from "@/components/ui";
import { mockDashboard } from "@/data/mockData";
import { formatTimeAgo, useSavedPlans, type SavedPlan } from "@/services/savedPlansService";

type Props = MainTabScreenProps<"Profile">;

export function ProfileScreen({ navigation }: Props) {
  const farmer = mockDashboard.farmer;
  const { plans, removePlan, sharePlan } = useSavedPlans();

  const handleOpenPlan = (plan: SavedPlan) => {
    // Navigate to RecommendationsScreen with this plan's result
    navigation.getParent()?.navigate("Recommendations", {
      result: plan.result,
    });
  };

  const handleDelete = (plan: SavedPlan) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Remove plan "${plan.title}" from saved plans?`);
      if (confirmed) {
        removePlan(plan.id);
      }
    } else {
      Alert.alert(
        "Delete Plan",
        `Are you sure you want to remove "${plan.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removePlan(plan.id),
          },
        ]
      );
    }
  };

  return (
    <View className="flex-1 bg-cream">
      <GradientHeader>
        <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-earth-soft">
          <Text className="font-sans-extrabold text-2xl text-white">RP</Text>
        </View>
        <Text className="font-sans-extrabold text-xl text-white">{farmer.name}</Text>
        <Text className="text-sm text-white/90">{farmer.phone}</Text>
        <Text className="text-xs text-white/75">
          {farmer.acres} acres · {farmer.location}
        </Text>
      </GradientHeader>

      <ScreenContainer safe={false} className="px-4">
        {/* ── Saved Plans Section ── */}
        <View className="mb-1 flex-row items-center justify-between">
          <SectionTitle>Saved crop plans ({plans.length})</SectionTitle>
          <Pressable
            onPress={() => navigation.getParent()?.navigate("FarmInput")}
            className="rounded-full bg-forest/10 px-2.5 py-1"
          >
            <Text className="font-sans-bold text-xs text-forest">+ New plan</Text>
          </Pressable>
        </View>

        {plans.length === 0 ? (
          <Card className="items-center py-6">
            <Text className="mb-1 text-2xl">🌾</Text>
            <Text className="font-sans-bold text-sm text-ink">No saved plans yet</Text>
            <Text className="mb-3 text-center text-xs text-ink-muted">
              Generate an AI crop recommendation and tap "Save & share plan" to track it here.
            </Text>
            <Pressable
              onPress={() => navigation.getParent()?.navigate("FarmInput")}
              className="rounded-lg bg-forest px-4 py-2"
            >
              <Text className="font-sans-bold text-xs text-white">Create your first plan</Text>
            </Pressable>
          </Card>
        ) : (
          plans.map((plan, index) => {
            const timeAgo = formatTimeAgo(plan.savedAt);
            const isLatest = index === 0;

            return (
              <Card key={plan.id} className="mb-3">
                {/* Header row: Title & Date pill */}
                <View className="mb-1.5 flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="font-sans-bold text-sm text-ink" numberOfLines={1}>
                      {plan.title}
                    </Text>
                    <Text className="text-[11px] text-ink-muted">
                      {plan.subtitle}
                    </Text>
                  </View>
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      isLatest ? "bg-forest/15" : "bg-ink-muted/15"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-sans-bold ${
                        isLatest ? "text-forest" : "text-ink-muted"
                      }`}
                    >
                      {timeAgo}
                    </Text>
                  </View>
                </View>

                {/* Crops allocation summary */}
                <View className="my-1.5 rounded-lg bg-cream-dark/30 p-2">
                  <Text className="text-[11px] font-sans-bold uppercase text-ink-light">
                    Allocated Crops
                  </Text>
                  <Text className="font-sans-medium text-xs text-ink mt-0.5">
                    {plan.cropsSummary}
                  </Text>
                </View>

                {/* Metrics pill row */}
                <View className="mb-2 flex-row flex-wrap items-center gap-2">
                  {plan.expectedProfitRange && (
                    <View className="rounded-md bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                      <Text className="text-[10px] font-sans-bold text-emerald-800">
                        Profit: {plan.expectedProfitRange}
                      </Text>
                    </View>
                  )}
                  {plan.waterAvailableMm != null && (
                    <View className="rounded-md bg-sky-50 px-2 py-0.5 border border-sky-200">
                      <Text className="text-[10px] font-sans-bold text-sky-800">
                        Water: {plan.waterAvailableMm.toFixed(0)} mm
                      </Text>
                    </View>
                  )}
                  {plan.confidence && (
                    <View className="rounded-md bg-amber-50 px-2 py-0.5 border border-amber-200">
                      <Text className="text-[10px] font-sans-bold text-amber-800">
                        {plan.confidence} Conf.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions row: View plan, Share, Delete */}
                <View className="mt-1 flex-row items-center justify-between border-t border-cream-dark/40 pt-2">
                  <Pressable
                    onPress={() => handleOpenPlan(plan)}
                    className="flex-row items-center gap-1 py-1"
                  >
                    <Text className="font-sans-bold text-xs text-forest">
                      View full plan →
                    </Text>
                  </Pressable>

                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => sharePlan(plan)}
                      className="flex-row items-center gap-1 rounded-md bg-forest/10 px-2.5 py-1"
                    >
                      <Text className="text-xs">📤</Text>
                      <Text className="font-sans-bold text-[11px] text-forest">
                        Share
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(plan)}
                      className="px-1.5 py-1"
                    >
                      <Text className="text-xs text-ink-light hover:text-danger">
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {/* ── Farm History Section ── */}
        <SectionTitle>Farm history</SectionTitle>
        <Card>
          <Text className="font-sans-bold text-sm text-ink">Kharif 2025</Text>
          <Text className="text-xs text-ink-muted">Soybean 3 ac · Actual yield 21 q/ac</Text>
          <Text className="font-sans-semibold text-xs text-success">Within predicted range</Text>
        </Card>
        <Card>
          <Text className="font-sans-bold text-sm text-ink">Rabi 2024-25</Text>
          <Text className="text-xs text-ink-muted">Wheat 2.5 ac · Price ₹2,340/q received</Text>
        </Card>

        <Pressable
          className="mt-2 py-3"
          onPress={() => navigation.getParent()?.navigate("Settings")}
        >
          <Text className="text-center font-sans-semibold text-sm text-forest">
            Settings →
          </Text>
        </Pressable>
      </ScreenContainer>
    </View>
  );
}
