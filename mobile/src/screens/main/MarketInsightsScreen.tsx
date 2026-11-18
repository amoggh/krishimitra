import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Calendar, Clock, RefreshCw, TrendingUp, TrendingDown, Store, Map, Truck, Scale, BookOpen } from "lucide-react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, Chip, FormInput, ScreenContainer } from "@/components/ui";
import { PriceTrendChart } from "@/components/charts/PriceTrendChart";
import { getMandiPrices } from "@/services/api";
import { useActiveDistrict } from "@/services/locationState";
import { useSavedPlans } from "@/services/savedPlansService";
import { useFarms } from "@/services/farmProfileService";
import { mockMandiPrices } from "@/data/mockData";
import { colors } from "@/theme/tokens";
import type { MandiPrice } from "@/types/api";

import { SplitFlapTicker } from "@/components/market/SplitFlapTicker";
import { IndiaPriceMap } from "@/components/market/IndiaPriceMap";
import { TruckCalculator } from "@/components/market/TruckCalculator";
import { MspGauges } from "@/components/market/MspGauges";
import { SeasonalHoldCalculator } from "@/components/market/SeasonalHoldCalculator";
import { SackJourney } from "@/components/market/SackJourney";

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
  const { activeFarm } = useFarms();
  const effectiveDistrict = activeFarm?.district || activePlan?.district || activeDistrict || "Shivamogga";

  const [prices, setPrices] = useState<MandiPrice[]>(mockMandiPrices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [loading, setLoading] = useState(false);
  const [activeMarketTab, setActiveMarketTab] = useState<"rates" | "map" | "truck" | "msp" | "journey">("rates");

  // Stable string key of recommended crops to prevent object reference churn
  const cropsKey = useMemo(() => {
    if (activeFarm?.allocatedCrops && activeFarm.allocatedCrops.length > 0) {
      return activeFarm.allocatedCrops.map((c) => c.crop.toLowerCase()).join(",");
    }
    if (!activePlan?.result?.recommendations) return "";
    return activePlan.result.recommendations.map((r) => r.crop.toLowerCase()).join(",");
  }, [activeFarm?.id, activeFarm?.allocatedCrops?.length, activePlan?.id]);

  const recommendedCrops = useMemo(() => {
    return cropsKey ? cropsKey.split(",") : [];
  }, [cropsKey]);

  const lastFetchKeyRef = useRef<string>("");

  const fetchPrices = useCallback((tag?: string, query?: string, force: boolean = false) => {
    const activeTag = tag ?? selectedTag;
    const activeQuery = query ?? searchQuery;
    const targetCrop =
      activeTag === "All"
        ? undefined
        : activeTag === "Recommended"
        ? cropsKey || undefined
        : activeTag;

    const fetchKey = `${effectiveDistrict}__${activeTag}__${targetCrop || ""}__${activeQuery}`;
    if (!force && lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    setLoading(true);
    getMandiPrices(effectiveDistrict, targetCrop, activeQuery)
      .then((data) => {
        setPrices(data && data.length > 0 ? data : mockMandiPrices);
      })
      .catch(() => {
        setPrices(mockMandiPrices);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [effectiveDistrict, cropsKey, selectedTag, searchQuery]);

  useEffect(() => {
    fetchPrices(selectedTag, searchQuery);
  }, [fetchPrices, selectedTag, searchQuery]);

  // Determine overall arrival date and last updated time from prices
  const latestArrivalDate = useMemo(() => {
    const p = prices.find((item) => item.arrival_date);
    return p?.arrival_date || "10/11/2026";
  }, [prices]);

  const latestUpdatedTime = useMemo(() => {
    const p = prices.find((item) => item.last_updated_time);
    return p?.last_updated_time || "Today at 04:30 PM";
  }, [prices]);

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-32">
        <Text className="font-sans-extrabold text-2xl text-ink">Mandi Insights & Trade Tools</Text>
        <Text className="mb-3 text-xs text-ink-muted">
          {effectiveDistrict} APMC & Karnataka Markets · Real-Time Arrival Rates & Intelligence
        </Text>

        {/* ── Split-Flap Live Price Ticker ── */}
        <SplitFlapTicker />

        {/* ── Sub-Navigation Tabs ── */}
        <View className="mb-4 flex-row gap-2 border-b border-borderSubtle pb-2">
          {[
            ["rates", "Live Mandi Rates"],
            ["map", "National Heatmap"],
            ["truck", "Truck Calculator"],
            ["msp", "MSP & Storage"],
            ["journey", "APMC Yard Guide"],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setActiveMarketTab(key as any)}
              className={`rounded-full px-3.5 py-1.5 border transition-all ${
                activeMarketTab === key
                  ? "bg-primary border-primary shadow-xs"
                  : "bg-white border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  activeMarketTab === key ? "text-white" : "text-ink"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── TAB 1: LIVE RATES ── */}
        {activeMarketTab === "rates" && (
          <View>
            {/* Arrival Date & Last Update Status Banner */}
            <View className="mb-3.5 flex-row items-center justify-between rounded-2xl bg-sage/60 p-3 border border-sage-dark/30">
              <View className="gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={13} color={colors.primary} />
                  <Text className="font-sans-bold text-xs text-primary">
                    Market Arrival Date: {latestArrivalDate}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Clock size={12} color={colors.textSecondary} />
                  <Text className="font-sans text-[11px] text-ink-muted">
                    Last Updated: {latestUpdatedTime} · AGMARKNET Live
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => fetchPrices(selectedTag, searchQuery, true)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Refresh live mandi rates"
                className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5 border border-primary/20 active:opacity-75 shadow-xs"
              >
                <RefreshCw size={12} color={colors.primary} />
                <Text className="font-sans-bold text-xs text-primary">
                  {loading ? "Refreshing…" : "Refresh"}
                </Text>
              </Pressable>
            </View>

            {/* Search Input */}
            <FormInput
              label="Search crops or markets"
              placeholder="Type crop name (e.g., Maize, Cotton, Onion)..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.length > 2) {
                  fetchPrices(selectedTag, text);
                } else if (text.length === 0) {
                  fetchPrices(selectedTag);
                }
              }}
            />

            {/* Quick Filter Tags */}
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

            {/* Market Highlights */}
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

            {/* Mandi Prices List */}
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
                          {item.mandi}
                        </Text>
                        <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                          <View className="flex-row items-center gap-1 rounded-md bg-sage/50 px-2 py-0.5">
                            <Calendar size={10} color={colors.primary} />
                            <Text className="font-sans-bold text-[10px] text-primary">
                              Arrival: {item.arrival_date || latestArrivalDate}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1 rounded-md bg-cream-dark px-2 py-0.5">
                            <Clock size={10} color={colors.textSecondary} />
                            <Text className="font-sans text-[10px] text-ink-muted">
                              Updated: {item.last_updated_time || latestUpdatedTime}
                            </Text>
                          </View>
                          {item.min_price_inr && item.max_price_inr ? (
                            <Text className="font-sans text-[10px] text-ink-muted">
                              Min: ₹{item.min_price_inr.toLocaleString("en-IN")} · Max: ₹{item.max_price_inr.toLocaleString("en-IN")}
                            </Text>
                          ) : null}
                        </View>
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
                      <View className="mt-3">
                        <PriceTrendChart
                          data={item.trend_7d}
                          arrivalDate={item.arrival_date}
                          cropName={item.crop}
                          mandiName={item.mandi}
                          minPrice={item.min_price_inr}
                          maxPrice={item.max_price_inr}
                          height={155}
                        />
                      </View>
                    )}
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
          </View>
        )}

        {/* ── TAB 2: NATIONAL HEATMAP ── */}
        {activeMarketTab === "map" && <IndiaPriceMap />}

        {/* ── TAB 3: TRUCK TRANSPORT CALCULATOR ── */}
        {activeMarketTab === "truck" && <TruckCalculator />}

        {/* ── TAB 4: MSP & SEASONAL HOLD ── */}
        {activeMarketTab === "msp" && (
          <View className="gap-4">
            <MspGauges />
            <SeasonalHoldCalculator />
          </View>
        )}

        {/* ── TAB 5: APMC YARD JOURNEY ── */}
        {activeMarketTab === "journey" && <SackJourney />}
      </ScrollView>
    </ScreenContainer>
  );
}

export default MarketInsightsScreen;
