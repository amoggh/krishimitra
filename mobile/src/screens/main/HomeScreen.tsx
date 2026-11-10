import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Alert, Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import {
  Card,
  CardSkeleton,
  RecommendationSkeleton,
  MandiPricesSkeleton,
  EmptyState,
  ErrorState,
  ResponsiveContainer,
  SectionHeader,
  WeatherDetailCard,
} from "@/components/ui";
import {
  DashboardWelcomeHeader,
  FarmOverviewCard,
  QuickActions,
  RecommendationHeroCard,
  MarketIntelligenceSection,
  FarmInsightsSection,
} from "@/components/home";
import { getDashboard, getMandiPrices } from "@/services/api";
import { useSavedPlans } from "@/services/savedPlansService";
import { useActiveDistrict } from "@/services/locationState";
import { getDistrictProfile } from "@/constants/districtProfiles";
import { mockDashboard, mockRecommendation } from "@/data/mockData";
import { useResponsive, useReducedMotion } from "@/theme/responsive";
import type { DashboardSummary, MandiPrice, RecommendationResult } from "@/types/api";
import { colors } from "@/theme/tokens";

type Props = MainTabScreenProps<"Home">;

export function HomeScreen({ navigation }: Props) {
  const { isDesktop, isTablet, isMobile, width } = useResponsive();
  const [dashboard, setDashboard] = useState<DashboardSummary>(mockDashboard);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const { activePlan, plans: savedPlans } = useSavedPlans();
  const { district: activeDistrict } = useActiveDistrict();

  const [mandiPrices, setMandiPrices] = useState<MandiPrice[]>([]);
  const [loadingMandi, setLoadingMandi] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // 1. Fetch initial dashboard data
  const loadDashboardData = () => {
    setLoadingDashboard(true);
    setDashboardError(null);
    getDashboard()
      .then((data) => {
        setDashboard(data);
      })
      .catch((err) => {
        console.warn("Using fallback dashboard data:", err);
        setDashboard(mockDashboard);
      })
      .finally(() => {
        setLoadingDashboard(false);
      });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 2. Active plan resolution
  const currentPlan = activePlan ?? (savedPlans.length > 0 ? savedPlans[0] : null);
  const recommendation: RecommendationResult =
    currentPlan?.result ?? dashboard.active_recommendation ?? mockRecommendation;
  const recentDateLabel = currentPlan?.formattedDate || "Active Plan";
  const planTitle = currentPlan?.title;

  // 3. Resolve location and profile dynamically
  const effectiveDistrict = currentPlan?.district || activeDistrict || "Mandya";
  const profile = getDistrictProfile(effectiveDistrict);

  // 4. Recommended crops for price filtering
  const recommendedCrops = useMemo(() => {
    return recommendation.recommendations?.map((r) => r.crop) || ["ragi", "maize"];
  }, [recommendation]);
  const recommendedCropsKey = recommendedCrops.join(",");

  // 5. Fetch mandi prices matching district and crops
  const loadMandiPrices = useCallback(() => {
    setLoadingMandi(true);
    getMandiPrices(effectiveDistrict, recommendedCrops)
      .then((data) => {
        if (data && data.length > 0) {
          setMandiPrices(data);
        } else {
          // Fallback constructed from recommendation's actual price results
          const fallbackList: MandiPrice[] = recommendation.recommendations.map((rec) => {
            const p = rec.price_result?.expected_inr_per_quintal ?? 3200;
            return {
              crop: rec.crop.charAt(0).toUpperCase() + rec.crop.slice(1),
              mandi: `${effectiveDistrict} APMC`,
              price_inr: p,
              change_pct: 2.4,
              updated_at: "Live (Today)",
              trend_7d: [p * 0.96, p * 0.98, p * 0.97, p * 1.01, p * 0.99, p * 1.02, p],
            };
          });
          setMandiPrices(fallbackList);
        }
      })
      .catch(() => {
        const fallbackList: MandiPrice[] = recommendation.recommendations.map((rec) => {
          const p = rec.price_result?.expected_inr_per_quintal ?? 3200;
          return {
            crop: rec.crop.charAt(0).toUpperCase() + rec.crop.slice(1),
            mandi: `${effectiveDistrict} APMC`,
            price_inr: p,
            change_pct: 1.8,
            updated_at: "Local Index",
            trend_7d: [p * 0.96, p * 0.98, p * 0.97, p * 1.01, p * 0.99, p * 1.02, p],
          };
        });
        setMandiPrices(fallbackList);
      })
      .finally(() => {
        setLoadingMandi(false);
      });
  }, [effectiveDistrict, recommendedCropsKey, recommendation]);

  useEffect(() => {
    loadMandiPrices();
  }, [loadMandiPrices]);

  // Gentle entrance animation honoring reduced motion accessibility
  const reduceMotion = useReducedMotion();
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      entranceAnim.setValue(1);
    } else {
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [reduceMotion]);

  const totalAcres =
    currentPlan?.totalAcres ?? recommendation.total_land_acres ?? dashboard.farmer.acres;

  // Active crops for the farm overview card
  const activeCropsList = useMemo(() => {
    return (recommendation.recommendations || []).map((r) => ({
      name: r.crop.charAt(0).toUpperCase() + r.crop.slice(1),
      acres: r.area_acres,
    }));
  }, [recommendation]);

  // Navigation handlers
  const handleNavigatePlan = () => navigation.getParent()?.navigate("FarmInput");
  const handleNavigateDisease = () => navigation.getParent()?.navigate("DiseaseDetection");
  const handleNavigateMarket = () => navigation.navigate("Market");
  const handleNavigateAssistant = () => navigation.navigate("Plan");
  const handleNavigateProfile = () => navigation.navigate("Profile");
  const handleViewFullPlan = () => {
    navigation.getParent()?.navigate("Recommendations", { result: recommendation });
  };

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const quickActionItems = [
    {
      id: "plan",
      label: "Crop Plan",
      subtitle: "AI land optimizer",
      onPress: handleNavigatePlan,
    },
    {
      id: "scan",
      label: "Scan Leaf",
      subtitle: "Disease AI",
      onPress: handleNavigateDisease,
    },
    {
      id: "mandi",
      label: "Mandi Rates",
      subtitle: "Live APMC prices",
      onPress: handleNavigateMarket,
    },
    {
      id: "assistant",
      label: "Krishi AI",
      subtitle: "Smart farm advisor",
      onPress: handleNavigateAssistant,
    },
  ];

  // Right column width for tablet vs desktop
  const rightColumnWidth = isDesktop ? 410 : 310;

  return (
    <View className="flex-1 bg-cream">
      {/* ── 1. Welcome Header (Adaptive: Compact on mobile, wide on desktop) ── */}
      <DashboardWelcomeHeader
        farmerName={dashboard.farmer.name}
        location={`${effectiveDistrict}, Karnataka`}
        totalAcres={totalAcres}
        tempC={profile.weather.temp_c}
        weatherCondition={profile.weather.condition}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onProfilePress={handleNavigateProfile}
        onNotificationPress={handleNotificationPress}
        hasNotification={true}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 pt-3"
        className="flex-1"
      >
        <ResponsiveContainer>
          <Animated.View style={{ opacity: entranceAnim }}>
          {dashboardError ? (
            <ErrorState
              title="Dashboard Connection Issue"
              message={dashboardError}
              onRetry={loadDashboardData}
            />
          ) : isDesktop || isTablet ? (
            /* ══════════════════════════════════════════════════════════
               DESKTOP & TABLET TWO-COLUMN BALANCED LAYOUT
               ══════════════════════════════════════════════════════════ */
            <View className="flex-row items-start gap-4 lg:gap-6">
              {/* Left Column (Primary: Farm Overview, Hero Recommendation, Daily Insights) */}
              <View className="flex-1 gap-4">
                {/* 2. Farm Overview */}
                <FarmOverviewCard
                  location={`${effectiveDistrict} Agricultural Zone`}
                  district={effectiveDistrict}
                  totalAcres={totalAcres}
                  season={`${recommendation.season ? recommendation.season.toUpperCase() : "KHARIF"} 2026`}
                  activeCrops={activeCropsList}
                  latitude={profile.coordinates.lat}
                  longitude={profile.coordinates.lon}
                  soilType={profile.soil.type}
                  soilPh={profile.soil.ph}
                  waterBudgetMm={profile.water_budget_litres_per_acre}
                />

                {/* 4. AI Crop Recommendation Hero */}
                {loadingDashboard ? (
                  <RecommendationSkeleton />
                ) : (
                  <RecommendationHeroCard
                    recommendation={recommendation}
                    dateLabel={recentDateLabel}
                    planTitle={planTitle}
                    onViewPlan={handleViewFullPlan}
                  />
                )}

                {/* 6. Today's Farm Insights */}
                <FarmInsightsSection
                  weather={profile.weather}
                  mandiPrices={mandiPrices}
                  soilType={profile.soil.type}
                  soilPh={profile.soil.ph}
                  waterBudgetMm={profile.water_budget_litres_per_acre}
                  onNavigateToDisease={handleNavigateDisease}
                  onNavigateToMarket={handleNavigateMarket}
                  onNavigateToPlan={handleNavigatePlan}
                />
              </View>

              {/* Right Column (Secondary: Quick Actions, Weather Details, Market Intelligence) */}
              <View style={{ width: rightColumnWidth }} className="gap-4">
                {/* 3. Quick Actions (2-Column Grid in side column) */}
                <View>
                  <SectionHeader
                    title="Quick Actions"
                    subtitle="Direct access to AI tools"
                  />
                  <QuickActions
                    columns={2}
                    actions={quickActionItems}
                  />
                </View>

                {/* Detailed Weather Card */}
                <WeatherDetailCard
                  location={`${effectiveDistrict} Agro-Climate Area`}
                  tempC={profile.weather.temp_c}
                  condition={profile.weather.condition}
                  humidityPct={profile.weather.rain_chance_pct > 0 ? 68 : 55}
                  precipitationMm={profile.weather.rain_chance_pct > 40 ? 5.2 : 0}
                  pressureHpa={1012}
                  windSpeedKmh={14}
                  sunrise="5:45 am"
                  sunset="6:15 pm"
                />

                {/* 5. Market Intelligence */}
                {loadingMandi ? (
                  <MandiPricesSkeleton />
                ) : (
                  <MarketIntelligenceSection
                    prices={mandiPrices}
                    district={effectiveDistrict}
                    onViewAllMandis={handleNavigateMarket}
                    onRetry={loadMandiPrices}
                  />
                )}
              </View>
            </View>
          ) : (
            /* ══════════════════════════════════════════════════════════
               MOBILE CAREFULLY ADAPTED STACKED LAYOUT
               1. Welcome Header (rendered at top)
               2. Farm Overview
               3. Quick Actions (2-Column Grid)
               4. AI Crop Recommendation Hero
               5. Market Intelligence Analytics
               6. Today's Farm Insights
               ══════════════════════════════════════════════════════════ */
            <View className="gap-3.5">
              {/* 2. Farm Overview */}
              <FarmOverviewCard
                location={`${effectiveDistrict} Farm Zone`}
                district={effectiveDistrict}
                totalAcres={totalAcres}
                season={`${recommendation.season ? recommendation.season.toUpperCase() : "KHARIF"} 2026`}
                activeCrops={activeCropsList}
                latitude={profile.coordinates.lat}
                longitude={profile.coordinates.lon}
                soilType={profile.soil.type}
                soilPh={profile.soil.ph}
                waterBudgetMm={profile.water_budget_litres_per_acre}
              />

              {/* 3. Quick Actions in a 2-Column Grid (No cramped horizontal overflow) */}
              <View>
                <SectionHeader
                  title="Quick Actions"
                  subtitle="One-tap access to AgriTech intelligence"
                />
                <QuickActions
                  columns={2}
                  actions={quickActionItems}
                />
              </View>

              {/* 4. AI Crop Recommendation (Hero) */}
              {loadingDashboard ? (
                <RecommendationSkeleton />
              ) : (
                <RecommendationHeroCard
                  recommendation={recommendation}
                  dateLabel={recentDateLabel}
                  planTitle={planTitle}
                  onViewPlan={handleViewFullPlan}
                />
              )}

              {/* 5. Market Intelligence Analytics */}
              {loadingMandi ? (
                <MandiPricesSkeleton />
              ) : (
                <MarketIntelligenceSection
                  prices={mandiPrices}
                  district={effectiveDistrict}
                  onViewAllMandis={handleNavigateMarket}
                  onRetry={loadMandiPrices}
                />
              )}

              {/* 6. Today's Farm Insights */}
              <FarmInsightsSection
                weather={profile.weather}
                mandiPrices={mandiPrices}
                soilType={profile.soil.type}
                soilPh={profile.soil.ph}
                waterBudgetMm={profile.water_budget_litres_per_acre}
                onNavigateToDisease={handleNavigateDisease}
                onNavigateToMarket={handleNavigateMarket}
                onNavigateToPlan={handleNavigatePlan}
              />
            </View>
          )}
          </Animated.View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-4"
          onPress={() => setShowNotificationModal(false)}
        >
          <Pressable
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="font-sans-bold text-base text-ink mb-1">
              Farm Notifications
            </Text>
            <Text className="font-sans text-xs text-ink-muted mb-4">
              Live automated alerts for {effectiveDistrict}
            </Text>

            <View className="gap-2.5 mb-4">
              <View className="rounded-xl bg-sage p-3 border border-sage-dark/40">
                <Text className="font-sans-bold text-xs text-primary">
                  Optimal Sowing Window
                </Text>
                <Text className="font-sans text-[11px] text-ink-muted mt-0.5">
                  Soil moisture is optimal for Ragi and Maize sowing in {effectiveDistrict}.
                </Text>
              </View>
              <View className="rounded-xl bg-gold-light p-3 border border-gold/30">
                <Text className="font-sans-bold text-xs text-ink">
                  Mandi Price Alert
                </Text>
                <Text className="font-sans text-[11px] text-ink-muted mt-0.5">
                  Ragi modal prices increased by 2.4% at {effectiveDistrict} APMC today.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowNotificationModal(false)}
              className="items-center justify-center rounded-full bg-primary py-2.5 active:bg-primary-dark"
            >
              <Text className="font-sans-bold text-xs text-white">Dismiss</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default HomeScreen;
