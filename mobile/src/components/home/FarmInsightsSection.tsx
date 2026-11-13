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
} from "lucide-react-native";
import { Card, Badge, SectionHeader, EmptyState } from "@/components/ui";
import { colors, radii, shadows } from "@/theme/tokens";
import type { WeatherSummary, MandiPrice } from "@/types/api";

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
  weather: WeatherSummary;
  mandiPrices: MandiPrice[];
  soilType?: string;
  soilPh?: number;
  waterBudgetMm?: number;
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
  waterBudgetMm = 561,
  onNavigateToDisease,
  onNavigateToMarket,
  onNavigateToPlan,
  className = "",
}: FarmInsightsSectionProps) {
  // Dynamically derive insights from real platform data
  const isRainLikely = weather.rain_chance_pct > 30;

  // Find top mandi rate
  const topCrop = mandiPrices.length > 0 ? mandiPrices[0] : null;

  const insights: FarmInsightItem[] = [
    {
      id: "weather-insight",
      category: "weather",
      title: isRainLikely ? "Rainfall Window Alert" : "Optimal Fieldwork Window",
      explanation: isRainLikely
        ? `Rain chance is ${weather.rain_chance_pct}% in ${weather.location}. Postpone fertilizer application to prevent runoff.`
        : `Clear skies (${weather.temp_c}°C) in ${weather.location}. Great conditions for foliar spray and intercultural weeding.`,
      priority: isRainLikely ? "Warning" : "Optimal",
      priorityTone: isRainLikely ? "warning" : "success",
      icon: isRainLikely ? (
        <CloudRain size={18} color={colors.warning} />
      ) : (
        <CloudSun size={18} color={colors.primary} />
      ),
      actionLabel: "Weather Details",
      onPress: onNavigateToPlan,
    },
    {
      id: "disease-insight",
      category: "health",
      title: "Leaf Health & Pest Inspection",
      explanation:
        "High vegetative growth stage requires vigilance. Scan crop leaves with AI to detect fungal blight or nutrient deficiencies before yield loss occurs.",
      priority: "Preventive",
      priorityTone: "gold",
      icon: <ScanLine size={18} color={colors.accent} />,
      actionLabel: "Scan Leaf Now",
      onPress: onNavigateToDisease,
    },
    ...(topCrop
      ? [
          {
            id: "market-insight",
            category: "market" as const,
            title: `${topCrop.crop} Price Dynamics`,
            explanation: `${topCrop.crop} trading at ₹${topCrop.price_inr.toLocaleString("en-IN")}/q (${topCrop.change_pct >= 0 ? "+" : ""}${topCrop.change_pct}%) at ${topCrop.mandi}. Good demand observed across state APMCs.`,
            priority: topCrop.change_pct >= 0 ? ("Bullish" as const) : ("Warning" as const),
            priorityTone: (topCrop.change_pct >= 0 ? "success" : "warning") as "success" | "warning",
            icon: <TrendingUp size={18} color={topCrop.change_pct >= 0 ? colors.primary : colors.warning} />,
            actionLabel: "Mandi Analytics",
            onPress: onNavigateToMarket,
          },
        ]
      : []),
    {
      id: "water-insight",
      category: "water",
      title: "Aquifer Water Budgeting",
      explanation: `${waterBudgetMm} mm seasonal water budget matches your ${soilType} (pH ${soilPh}). Use micro-irrigation to maintain optimal root aeration.`,
      priority: "Optimal",
      priorityTone: "info",
      icon: <Droplets size={18} color={colors.info} />,
      actionLabel: "Farm Water Plan",
      onPress: onNavigateToPlan,
    },
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

