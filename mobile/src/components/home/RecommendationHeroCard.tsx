import React from "react";
import { View, Text, Pressable } from "react-native";
import {
  Sparkles,
  TrendingUp,
  ChevronRight,
  Sprout,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react-native";
import { Card, Badge, AppButton, EmptyState } from "@/components/ui";
import { colors, radii, shadows } from "@/theme/tokens";
import type { RecommendationResult } from "@/types/api";

export type RecommendationHeroCardProps = {
  recommendation: RecommendationResult;
  dateLabel?: string;
  planTitle?: string;
  onViewPlan: () => void;
  className?: string;
};

const CROP_PALETTE = ["#145C3A", "#E9B44C", "#2B6CB0", "#8E44AD", "#E67E22"];

export function RecommendationHeroCard({
  recommendation,
  dateLabel = "Active Recommendation",
  planTitle,
  onViewPlan,
  className = "",
}: RecommendationHeroCardProps) {
  const crops = recommendation?.recommendations || [];
  
  if (!crops || crops.length === 0) {
    return (
      <View className={className}>
        <EmptyState
          title="No Crop Recommendation Yet"
          description="Create your first tailored crop plan using our NSGA-II multi-objective AI engine with your farm's soil, water, and budget parameters."
          actionLabel="Generate Crop Plan"
          onAction={onViewPlan}
          icon={<Sprout size={32} color={colors.primary} />}
        />
      </View>
    );
  }

  const totalAcres =
    recommendation.total_land_acres ||
    crops.reduce((sum, c) => sum + c.area_acres, 0) ||
    1;

  // Aggregate profit range
  const lower = crops
    .map((c) => c.net_profit_lower_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const upper = crops
    .map((c) => c.net_profit_upper_inr ?? null)
    .filter((v): v is number => v != null)
    .reduce((a, b) => a + b, 0);

  const hasProfit = lower > 0 || upper > 0;

  return (
    <Card
      className={`p-4 border-2 border-primary/15 ${className}`}
      style={{
        ...shadows.card,
        borderRadius: radii.card,
      }}
    >
      {/* Flagship Header */}
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="h-6 w-6 items-center justify-center rounded-full bg-sage">
            <Sparkles size={14} color={colors.primary} />
          </View>
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-primary">
            AI Crop Recommendation
          </Text>
        </View>

        <Badge
          label={recommendation.status === "ok" ? "Optimized" : "Draft"}
          tone="success"
          dot
          size="sm"
        />
      </View>

      {/* Plan Title & Metadata */}
      <Text className="font-sans-extrabold text-xl text-ink tracking-tight">
        {planTitle || `${recommendation.season.toUpperCase()} Optimal Allocation`}
      </Text>

      <View className="mt-1 flex-row items-center gap-2">
        <View className="flex-row items-center gap-1">
          <Calendar size={12} color={colors.textSecondary} />
          <Text className="font-sans text-xs text-ink-muted">
            {dateLabel} · {recommendation.location}
          </Text>
        </View>
      </View>

      {/* Profit Range Highlight Banner */}
      {hasProfit ? (
        <View className="my-3 flex-row items-center justify-between rounded-xl bg-sage p-3 border border-sage-dark/60">
          <View>
            <Text className="font-sans-bold text-[10px] uppercase tracking-wider text-primary">
              Projected Net Profit
            </Text>
            <Text className="font-sans-extrabold text-lg text-primary tracking-tight">
              ₹{(lower / 100000).toFixed(1)}L – ₹{(upper / 100000).toFixed(1)}L
            </Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs">
            <TrendingUp size={18} color={colors.primary} />
          </View>
        </View>
      ) : null}

      {/* Visual Land Allocation Segmented Bar */}
      {crops.length > 0 && (
        <View className="my-2">
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="font-sans-bold text-[11px] uppercase tracking-wider text-ink-muted">
              Land Division ({totalAcres.toFixed(1)} ac)
            </Text>
          </View>

          {/* Segmented Bar */}
          <View className="h-3 w-full flex-row overflow-hidden rounded-full bg-cream-muted">
            {crops.map((c, i) => {
              const pct = (c.area_acres / totalAcres) * 100;
              const barColor = CROP_PALETTE[i % CROP_PALETTE.length];
              return (
                <View
                  key={i}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                  }}
                />
              );
            })}
          </View>

          {/* Crop Mini Cards Grid */}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {crops.map((c, i) => {
              const pct = ((c.area_acres / totalAcres) * 100).toFixed(0);
              const barColor = CROP_PALETTE[i % CROP_PALETTE.length];
              const cropTitle = c.crop.charAt(0).toUpperCase() + c.crop.slice(1);
              const yieldStr = c.yield_result?.expected_t_per_ha
                ? `${c.yield_result.expected_t_per_ha.toFixed(1)} t/ha`
                : null;
              const priceStr = c.price_result?.expected_inr_per_quintal
                ? `₹${Math.round(c.price_result.expected_inr_per_quintal / 100) / 10}k/q`
                : null;

              return (
                <View
                  key={i}
                  className="flex-1 min-w-[135px] rounded-xl bg-cream p-2.5 border border-cream-muted"
                >
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                    <Text className="font-sans-bold text-xs text-ink" numberOfLines={1}>
                      {cropTitle}
                    </Text>
                  </View>
                  <Text className="mt-0.5 font-sans-semibold text-[11px] text-ink-muted">
                    {c.area_acres.toFixed(1)} ac ({pct}%)
                  </Text>
                  {(yieldStr || priceStr) && (
                    <Text className="mt-1 font-sans text-[10px] text-primary">
                      {yieldStr ? `Yield: ${yieldStr}` : ""}{yieldStr && priceStr ? " · " : ""}{priceStr || ""}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* CTA Button to Full Recommendations Screen */}
      <View className="mt-4 pt-3 border-t border-cream-muted/50">
        <AppButton
          label="View Full Crop Plan & Analytics"
          variant="primary"
          size="md"
          rightIcon={<ChevronRight size={16} color={colors.white} />}
          onPress={onViewPlan}
        />
      </View>
    </Card>
  );
}

export default RecommendationHeroCard;

