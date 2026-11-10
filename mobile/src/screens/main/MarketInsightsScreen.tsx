import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, Chip, FormInput, ScreenContainer } from "@/components/ui";
import { PriceTrendChart } from "@/components/charts/PriceTrendChart";
import { getMandiPrices } from "@/services/api";
import { useActiveDistrict } from "@/services/locationState";
import { useSavedPlans } from "@/services/savedPlansService";
import { mockMandiPrices } from "@/data/mockData";
import type { MandiPrice } from "@/types/api";

type Props = MainTabScreenProps<"Market">;

const COMMON_CROP_TAGS = [
  "All",
  "Ragi",
  "Maize",
  "Cotton",
  "Groundnut",
  "Rice / Paddy",
  "Sugarcane",
  "Onion",
  "Tomato",
];

export function MarketInsightsScreen(_props: Props) {
  const { district: activeDistrict } = useActiveDistrict();
  const { activePlan } = useSavedPlans();
  const effectiveDistrict = activePlan?.district || activeDistrict || "Mandya";

  const [prices, setPrices] = useState<MandiPrice[]>(mockMandiPrices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [loading, setLoading] = useState(false);

  // Extract recommended crops from the current saved plan
  const recommendedCrops = useMemo(() => {
    if (!activePlan?.result?.recommendations) return [];
    return activePlan.result.recommendations.map((r) => r.crop.toLowerCase());
  }, [activePlan]);

  // Fetch mandi prices whenever district changes
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMandiPrices(effectiveDistrict)
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setPrices(data);
        } else if (mounted) {
          setPrices(mockMandiPrices);
        }
      })
      .catch(() => {
        if (mounted) setPrices(mockMandiPrices);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [effectiveDistrict]);

  // Filter crops based on search query and tag selection
  const filteredPrices = useMemo(() => {
    return prices.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.crop.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.mandi.toLowerCase().includes(searchQuery.toLowerCase().trim());

      let matchTag = true;
      if (selectedTag === "Recommended") {
        matchTag = recommendedCrops.some((rc) => item.crop.toLowerCase().includes(rc));
      } else if (selectedTag !== "All") {
        matchTag = item.crop.toLowerCase().includes(selectedTag.toLowerCase());
      }

      return matchSearch && matchTag;
    });
  }, [prices, searchQuery, selectedTag, recommendedCrops]);

  // Dynamically calculate market analytics from real data (no hardcoding)
  const topGainer = useMemo(() => {
    if (!prices.length) return null;
    return prices.reduce((max, item) => (item.change_pct > (max?.change_pct ?? -999) ? item : max), prices[0]);
  }, [prices]);

  const topLoser = useMemo(() => {
    if (!prices.length) return null;
    return prices.reduce((min, item) => (item.change_pct < (min?.change_pct ?? 999) ? item : min), prices[0]);
  }, [prices]);

  const averagePrice = useMemo(() => {
    if (!prices.length) return 0;
    const total = prices.reduce((sum, item) => sum + item.price_inr, 0);
    return Math.round(total / prices.length);
  }, [prices]);

  return (
    <ScreenContainer>
      <Text className="font-sans-extrabold text-2xl text-ink">Mandi Insights</Text>
      <Text className="mb-3 text-xs text-ink-muted">
        {effectiveDistrict} APMC & Karnataka Markets · Daily Arrival Rates
      </Text>

      {/* ── Search Input ── */}
      <FormInput
        label="Search crops or markets"
        placeholder="Type crop name (e.g., Maize, Cotton, Onion)..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* ── Quick Filter Tags ── */}
      <View className="-mt-1 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {recommendedCrops.length > 0 && (
            <Chip
              label="★ Recommended Crops"
              tone="success"
              selected={selectedTag === "Recommended"}
              onPress={() => {
                setSelectedTag(selectedTag === "Recommended" ? "All" : "Recommended");
              }}
            />
          )}
          {COMMON_CROP_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={selectedTag === tag}
              onPress={() => {
                setSelectedTag(tag);
                if (tag !== "All") {
                  setSearchQuery("");
                }
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Dynamic Market Highlights (Calculated from active data) ── */}
      <View className="mb-4 flex-row gap-2.5">
        <Card className="flex-1 py-2.5 px-3">
          <Text className="font-sans-bold text-[10px] uppercase text-ink-light">Top Gainer</Text>
          <Text className="font-sans-bold text-sm text-forest" numberOfLines={1}>
            {topGainer ? `${topGainer.crop} +${topGainer.change_pct}%` : "—"}
          </Text>
          <Text className="text-[10px] text-ink-muted">
            {topGainer ? `₹${topGainer.price_inr.toLocaleString("en-IN")}/q` : "Updating..."}
          </Text>
        </Card>

        <Card className="flex-1 py-2.5 px-3">
          <Text className="font-sans-bold text-[10px] uppercase text-ink-light">Market Watch</Text>
          <Text className="font-sans-bold text-sm text-warning" numberOfLines={1}>
            {topLoser ? `${topLoser.crop} ${topLoser.change_pct}%` : "—"}
          </Text>
          <Text className="text-[10px] text-ink-muted">
            {topLoser ? `₹${topLoser.price_inr.toLocaleString("en-IN")}/q` : "Updating..."}
          </Text>
        </Card>

        <Card className="flex-1 py-2.5 px-3">
          <Text className="font-sans-bold text-[10px] uppercase text-ink-light">District Avg</Text>
          <Text className="font-sans-bold text-sm text-ink" numberOfLines={1}>
            ₹{averagePrice.toLocaleString("en-IN")}
          </Text>
          <Text className="text-[10px] text-ink-muted">per quintal</Text>
        </Card>
      </View>

      {/* ── Mandi Prices List ── */}
      {filteredPrices.length > 0 ? (
        filteredPrices.map((item) => {
          const isRec = recommendedCrops.some((rc) => item.crop.toLowerCase().includes(rc));
          return (
            <Card key={`${item.crop}-${item.mandi}`} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-sans-extrabold text-base text-ink">{item.crop}</Text>
                    {isRec && <Chip label="In Current Plan" tone="success" />}
                  </View>
                  <Text className="mt-0.5 text-xs text-ink-muted">
                    {item.mandi} · {item.updated_at}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-sans-extrabold text-xl text-forest">
                    ₹{item.price_inr.toLocaleString("en-IN")}
                    <Text className="text-xs font-sans-medium text-ink-muted">/q</Text>
                  </Text>
                  <Text
                    className={`font-sans-bold text-xs ${
                      item.change_pct >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {item.change_pct >= 0 ? "+" : ""}
                    {item.change_pct}%
                  </Text>
                </View>
              </View>

              {item.trend_7d && item.trend_7d.length > 0 && (
                <View className="mt-2.5">
                  <PriceTrendChart data={item.trend_7d} height={90} />
                </View>
              )}
              <Text className="mt-1 text-[11px] text-ink-muted">
                7-day market arrival trajectory · {item.mandi}
              </Text>
            </Card>
          );
        })
      ) : (
        <Card className="py-6 items-center">
          <Text className="font-sans-bold text-sm text-ink">No crops found</Text>
          <Text className="mt-1 text-xs text-ink-muted text-center px-4">
            No market prices matching &ldquo;{searchQuery || selectedTag}&rdquo; in {effectiveDistrict}.
          </Text>
          <Pressable
            onPress={() => {
              setSearchQuery("");
              setSelectedTag("All");
            }}
            className="mt-3 rounded-lg bg-forest/10 px-3.5 py-1.5"
          >
            <Text className="font-sans-bold text-xs text-forest">Reset Filters</Text>
          </Pressable>
        </Card>
      )}
    </ScreenContainer>
  );
}
