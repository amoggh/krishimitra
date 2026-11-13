import React, { useState } from "react";
import { View, Text, Pressable, Platform, LayoutAnimation, UIManager } from "react-native";
import {
  CloudSun,
  CloudRain,
  ScanLine,
  TrendingUp,
  Droplets,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle2,
  Wind,
  SunMedium,
  AlertTriangle,
} from "lucide-react-native";
import { Card, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { colors, radii, shadows } from "@/theme/tokens";
import type { WeatherSummary, MandiPrice } from "@/types/api";
import type { ExtendedWeatherData } from "@/services/api/weatherService";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type FarmInsightItem = {
  id: string;
  category: "weather" | "health" | "market" | "water";
  title: string;
  explanation: string;
  priority: "Optimal" | "Warning" | "Preventive" | "Bullish";
  priorityTone: "success" | "warning" | "danger" | "gold" | "info";
  icon: React.ReactNode;
  actionLabel: string;
  onPress: () => void;
};

export type FarmInsightsSectionProps = {
  weather: WeatherSummary | ExtendedWeatherData;
  mandiPrices: MandiPrice[];
  soilType?: string;
  soilPh?: number;
  waterBudgetMm?: number;
  waterLitresPerAcre?: number;
  onNavigateToDisease: () => void;
  onNavigateToMarket: () => void;
  onNavigateToPlan: () => void;
  className?: string;
};

export function FarmInsightsSection({
  weather,
  mandiPrices,
  soilType = "Red sandy loam",
  soilPh = 6.8,
  waterBudgetMm = 520,
  waterLitresPerAcre,
  onNavigateToDisease,
  onNavigateToMarket,
  onNavigateToPlan,
  className = "",
}: FarmInsightsSectionProps) {
  // Extract extended or standard weather metrics dynamically
  const extWeather = weather as ExtendedWeatherData;
  const tempC = weather.temp_c ?? 28;
  const rainChance = weather.rain_chance_pct ?? 0;
  const condition = weather.condition || "Partly cloudy";
  const location = weather.location || "Farm Zone";
  const humidity = extWeather.humidity_pct ?? (rainChance > 40 ? 76 : 58);
  const precipitationMm = extWeather.precipitation_mm ?? (rainChance > 50 ? 4.2 : 0);
  const windSpeedKmh = extWeather.wind_speed_kmh ?? 12;

  // 1. DYNAMIC WEATHER & FIELDWORK ADVISORY (Agro-meteorological rules, zero fertilizer references)
  let weatherItem: FarmInsightItem;

  const isRainImminent =
    precipitationMm > 1.0 ||
    rainChance >= 50 ||
    condition.toLowerCase().includes("rain") ||
    condition.toLowerCase().includes("thunder");
  const isHighWind = windSpeedKmh >= 18;
  const isExtremeHeat = tempC >= 34;

  if (isRainImminent) {
    const rainEstimate = precipitationMm > 0 ? `${precipitationMm} mm` : `${rainChance}% probability`;
    weatherItem = {
      id: "weather-insight",
      category: "weather",
      title: "Rainfall Window Alert",
      explanation: `Rain probability is ${rainChance}% (${rainEstimate}) in ${location}. Suspend foliar sprays and maintain clear field drainage to prevent waterlogging.`,
      priority: "Warning",
      priorityTone: "warning",
      icon: <CloudRain size={18} color={colors.warning} />,
      actionLabel: "Weather Details",
      onPress: onNavigateToPlan,
    };
  } else if (isHighWind) {
    weatherItem = {
      id: "weather-insight",
      category: "weather",
      title: "Wind Spray Drift Alert",
      explanation: `Wind speed is ${windSpeedKmh} km/h in ${location}. Avoid foliar treatments to prevent spray drift and uneven canopy coverage. Resume when wind drops below 12 km/h.`,
      priority: "Warning",
      priorityTone: "warning",
      icon: <Wind size={18} color={colors.warning} />,
      actionLabel: "Weather Details",
      onPress: onNavigateToPlan,
    };
  } else if (isExtremeHeat) {
    weatherItem = {
      id: "weather-insight",
      category: "weather",
      title: "Heat Stress Advisory",
      explanation: `High ambient temperature (${tempC}°C) in ${location}. Conduct fieldwork and crop scouting during early morning or late evening to prevent vegetative heat stress.`,
      priority: "Warning",
      priorityTone: "warning",
      icon: <SunMedium size={18} color={colors.warning} />,
      actionLabel: "Weather Details",
      onPress: onNavigateToPlan,
    };
  } else {
    weatherItem = {
      id: "weather-insight",
      category: "weather",
      title: "Optimal Fieldwork Window",
      explanation: `Clear microclimate (${tempC}°C, ${condition.toLowerCase()}) in ${location}. Optimal window for intercultural weeding, soil aeration, and morning crop maintenance.`,
      priority: "Optimal",
      priorityTone: "success",
      icon: <CloudSun size={18} color={colors.primary} />,
      actionLabel: "Weather Details",
      onPress: onNavigateToPlan,
    };
  }

  // 2. DYNAMIC LEAF HEALTH & DISEASE FORECASTING (Wallin & Smith agromet index)
  let healthItem: FarmInsightItem;

  const isHighFungalRisk = (humidity >= 72 || rainChance >= 50) && tempC >= 18 && tempC <= 29;
  const isSuckingPestRisk = tempC >= 31 && humidity <= 50;

  if (isHighFungalRisk) {
    healthItem = {
      id: "disease-insight",
      category: "health",
      title: "Fungal Spore Germination Risk",
      explanation: `Canopy humidity at ${humidity}% with ${tempC}°C temperature accelerates fungal spore germination (blight & leaf spot). Scan leaves with AI to detect early lesions.`,
      priority: "Warning",
      priorityTone: "warning",
      icon: <AlertTriangle size={18} color={colors.warning} />,
      actionLabel: "Scan Leaf Now",
      onPress: onNavigateToDisease,
    };
  } else if (isSuckingPestRisk) {
    healthItem = {
      id: "disease-insight",
      category: "health",
      title: "Pest & Moisture Stress Inspection",
      explanation: `Dry, warm microclimate (${tempC}°C, ${humidity}% RH) accelerates sucking pests (thrips, mites). Inspect under-leaf surfaces and scan foliage with AI for timely detection.`,
      priority: "Preventive",
      priorityTone: "gold",
      icon: <ScanLine size={18} color={colors.accent} />,
      actionLabel: "Scan Leaf Now",
      onPress: onNavigateToDisease,
    };
  } else {
    healthItem = {
      id: "disease-insight",
      category: "health",
      title: "Canopy Health & Vigor Scouting",
      explanation: `Microclimate (${tempC}°C, ${humidity}% RH) is favorable for steady vegetative growth. Perform routine AI leaf scanning to monitor chlorophyll vigor and verify zero disease onset.`,
      priority: "Optimal",
      priorityTone: "success",
      icon: <ScanLine size={18} color={colors.primary} />,
      actionLabel: "Scan Leaf Now",
      onPress: onNavigateToDisease,
    };
  }

  // 3. DYNAMIC MARKET INTELLIGENCE (Derived from real APMC prices)
  let marketItem: FarmInsightItem | null = null;
  if (mandiPrices.length > 0) {
    // Pick the crop with most significant price change or first available
    const sortedByImpact = [...mandiPrices].sort(
      (a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct)
    );
    const topCrop = sortedByImpact[0];

    const isBullish = topCrop.change_pct > 0;
    const isBearish = topCrop.change_pct < 0;

    let marketExplanation = "";
    if (isBullish) {
      marketExplanation = `${topCrop.crop} trading up at ₹${topCrop.price_inr.toLocaleString("en-IN")}/q (+${topCrop.change_pct}%) at ${topCrop.mandi}. Strong demand across regional APMCs offers favorable harvest realization.`;
    } else if (isBearish) {
      marketExplanation = `${topCrop.crop} quoted at ₹${topCrop.price_inr.toLocaleString("en-IN")}/q (${topCrop.change_pct}%) at ${topCrop.mandi}. Increased wholesale market arrivals noted; consider staging dispatch or on-farm drying.`;
    } else {
      marketExplanation = `${topCrop.crop} holding steady at ₹${topCrop.price_inr.toLocaleString("en-IN")}/q at ${topCrop.mandi}. Consistent wholesale procurement and stable mandi buyer arrivals.`;
    }

    marketItem = {
      id: "market-insight",
      category: "market",
      title: `${topCrop.crop} Price Dynamics`,
      explanation: marketExplanation,
      priority: isBullish ? "Bullish" : isBearish ? "Warning" : "Optimal",
      priorityTone: isBullish ? "success" : isBearish ? "warning" : "info",
      icon: <TrendingUp size={18} color={isBullish ? colors.primary : isBearish ? colors.warning : colors.info} />,
      actionLabel: "Mandi Analytics",
      onPress: onNavigateToMarket,
    };
  }

  // 4. DYNAMIC AQUIFER WATER BUDGETING (Derived from soil, depth mm, & real precipitation)
  let waterItem: FarmInsightItem;
  const isRainRecharge = precipitationMm >= 3.0 || rainChance >= 60;
  const isWaterStress = tempC >= 32 && rainChance <= 20 && humidity <= 50;

  if (isRainRecharge) {
    waterItem = {
      id: "water-insight",
      category: "water",
      title: "Soil Moisture & Rain Recharge",
      explanation: `Natural precipitation (~${precipitationMm > 0 ? precipitationMm + " mm" : "active rain"}) is replenishing ${soilType} (pH ${soilPh}). Reduce scheduled irrigation cycles to preserve aquifer reserves and avoid waterlogging.`,
      priority: "Optimal",
      priorityTone: "success",
      icon: <Droplets size={18} color={colors.primary} />,
      actionLabel: "Farm Water Plan",
      onPress: onNavigateToPlan,
    };
  } else if (isWaterStress) {
    waterItem = {
      id: "water-insight",
      category: "water",
      title: "Evaporative Moisture Deficit",
      explanation: `High evapotranspiration (${tempC}°C, ${humidity}% RH) increases root-zone drying in ${soilType}. Seasonal allocation is ${waterBudgetMm} mm. Maintain micro-drip cycles during early morning.`,
      priority: "Warning",
      priorityTone: "warning",
      icon: <Droplets size={18} color={colors.warning} />,
      actionLabel: "Farm Water Plan",
      onPress: onNavigateToPlan,
    };
  } else {
    waterItem = {
      id: "water-insight",
      category: "water",
      title: "Aquifer Water Budgeting",
      explanation: `${waterBudgetMm} mm seasonal water budget matches your ${soilType} (pH ${soilPh}). Micro-irrigation maintains optimal root aeration while conserving local groundwater.`,
      priority: "Optimal",
      priorityTone: "info",
      icon: <Droplets size={18} color={colors.info} />,
      actionLabel: "Farm Water Plan",
      onPress: onNavigateToPlan,
    };
  }

  const insights: FarmInsightItem[] = [
    weatherItem,
    healthItem,
    ...(marketItem ? [marketItem] : []),
    waterItem,
  ];

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (insights.length === 0) {
    return (
      <View className={`mb-4 ${className}`}>
        <SectionHeader
          title="Today's Farm Insights"
          subtitle="Actionable intelligence derived from live farm & market metrics"
        />
        <EmptyState
          title="All Farm Metrics Optimal"
          description="No urgent advisories or anomalies detected today for your active crops and acreage."
          actionLabel="Review Crop Plan"
          onAction={onNavigateToPlan}
          icon={<CheckCircle2 size={32} color={colors.primary} />}
        />
      </View>
    );
  }

  return (
    <View className={`mb-4 ${className}`}>
      <SectionHeader
        title="Today's Farm Insights"
        subtitle="Actionable intelligence derived from live farm & market metrics"
      />

      <View className="gap-2.5">
        {insights.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View
              key={item.id}
              className="rounded-2xl bg-white border border-[#183B2B]/[0.06] overflow-hidden"
              style={{
                ...shadows.subtle,
                borderRadius: radii.card,
              }}
            >
              <Pressable
                onPress={() => toggleExpand(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.priority} priority. Tap to toggle details.`}
                className="flex-row items-start p-3.5 active:bg-cream/40"
              >
                {/* Category Icon Badge */}
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-sage">
                  {item.icon}
                </View>

                {/* Content Body */}
                <View className="flex-1 pr-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-sans-bold text-sm text-ink tracking-tight flex-1 pr-2">
                      {item.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Badge
                        label={item.priority}
                        tone={item.priorityTone}
                        size="sm"
                        dot
                      />
                      <ChevronDown
                        size={14}
                        color={colors.textSecondary}
                        style={{
                          transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
                        }}
                      />
                    </View>
                  </View>

                  <Text
                    numberOfLines={isExpanded ? undefined : 2}
                    className="font-sans text-xs leading-4 text-ink-muted"
                  >
                    {item.explanation}
                  </Text>
                </View>
              </Pressable>

              {/* Smooth Expanded Advisory Details */}
              {isExpanded && (
                <View className="px-3.5 pb-3.5 pt-1 border-t border-cream-muted/40 bg-sage/20">
                  <View className="flex-row items-center justify-between pt-2">
                    <View className="flex-row items-center gap-1.5">
                      <Info size={13} color={colors.primary} />
                      <Text className="font-sans-medium text-[11px] text-ink-muted">
                        Agronomy Advisory Engine
                      </Text>
                    </View>

                    <Pressable
                      onPress={item.onPress}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.actionLabel}`}
                      className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-primary active:opacity-90"
                    >
                      <Text className="font-sans-bold text-xs text-white">
                        {item.actionLabel}
                      </Text>
                      <ChevronRight size={13} color={colors.white} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default FarmInsightsSection;

