import React, { useEffect, useRef } from "react";
import { Animated, View, type ViewProps, type DimensionValue } from "react-native";
import { radii } from "@/theme/tokens";

export type SkeletonProps = ViewProps & {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: "sm" | "md" | "lg" | "card" | "full";
  className?: string;
};

const ROUNDED_MAP = {
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  card: radii.card,
  full: radii.full,
};

export function Skeleton({
  width = "100%",
  height = 16,
  rounded = "md",
  className = "",
  style,
  ...rest
}: SkeletonProps) {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [opacityAnim]);

  return (
    <Animated.View
      className={`bg-cream-muted ${className}`}
      style={[
        {
          width,
          height,
          borderRadius: ROUNDED_MAP[rounded] ?? radii.md,
          opacity: opacityAnim,
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <View
      className={`mb-3.5 bg-white p-4 border border-[#183B2B]/[0.06] ${className}`}
      style={{ borderRadius: radii.card }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Skeleton width="45%" height={18} rounded="md" />
        <Skeleton width={64} height={20} rounded="full" />
      </View>
      <Skeleton width="90%" height={14} rounded="md" className="mb-2" />
      <Skeleton width="65%" height={14} rounded="md" className="mb-4" />
      <Skeleton width="100%" height={40} rounded="md" />
    </View>
  );
}

export function StatCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <View
      className={`p-4 bg-white border border-[#183B2B]/[0.06] ${className}`}
      style={{ borderRadius: radii.card }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Skeleton width="50%" height={12} rounded="sm" />
        <Skeleton width={32} height={32} rounded="full" />
      </View>
      <Skeleton width="70%" height={26} rounded="md" className="my-1.5" />
      <Skeleton width="40%" height={12} rounded="sm" />
    </View>
  );
}

/** Farmer Profile Header Skeleton */
export function ProfileSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`flex-row items-center justify-between p-4 bg-white border border-[#183B2B]/[0.06] ${className}`} style={{ borderRadius: radii.card }}>
      <View className="flex-row items-center gap-3">
        <Skeleton width={48} height={48} rounded="full" />
        <View className="gap-1.5">
          <Skeleton width={140} height={16} rounded="md" />
          <Skeleton width={90} height={12} rounded="sm" />
        </View>
      </View>
      <Skeleton width={70} height={28} rounded="full" />
    </View>
  );
}

/** Weather Information Card Skeleton */
export function WeatherSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`p-4 bg-white border border-[#183B2B]/[0.06] ${className}`} style={{ borderRadius: radii.card }}>
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton width={130} height={14} rounded="md" />
        <Skeleton width={80} height={20} rounded="full" />
      </View>
      <View className="flex-row items-center justify-between mb-4">
        <Skeleton width={90} height={40} rounded="lg" />
        <Skeleton width={48} height={48} rounded="full" />
      </View>
      <View className="flex-row gap-2 pt-2 border-t border-[#183B2B]/[0.06]">
        <Skeleton width="22%" height={32} rounded="md" />
        <Skeleton width="22%" height={32} rounded="md" />
        <Skeleton width="22%" height={32} rounded="md" />
        <Skeleton width="22%" height={32} rounded="md" />
      </View>
    </View>
  );
}

/** Farm Overview Card Skeleton */
export function FarmOverviewSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`p-4 bg-white border border-[#183B2B]/[0.06] ${className}`} style={{ borderRadius: radii.card }}>
      <View className="flex-row items-start justify-between mb-3">
        <View className="gap-1.5 flex-1 pr-2">
          <Skeleton width="60%" height={18} rounded="md" />
          <Skeleton width="40%" height={12} rounded="sm" />
        </View>
        <Skeleton width={80} height={22} rounded="full" />
      </View>
      <Skeleton width="100%" height={110} rounded="card" className="mb-3" />
      <View className="flex-row items-center justify-between pt-2 border-t border-[#183B2B]/[0.06]">
        <View className="flex-row gap-1.5">
          <Skeleton width={64} height={22} rounded="full" />
          <Skeleton width={64} height={22} rounded="full" />
        </View>
        <Skeleton width={100} height={24} rounded="md" />
      </View>
    </View>
  );
}

/** AI Crop Recommendation Hero Skeleton */
export function RecommendationSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`p-4 bg-white border-2 border-primary/15 ${className}`} style={{ borderRadius: radii.card }}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="gap-1.5">
          <Skeleton width={160} height={18} rounded="md" />
          <Skeleton width={110} height={12} rounded="sm" />
        </View>
        <Skeleton width={85} height={24} rounded="full" />
      </View>
      {/* Profit Banner Placeholder */}
      <Skeleton width="100%" height={64} rounded="lg" className="mb-3.5" />
      {/* Allocation Segment Bar Placeholder */}
      <Skeleton width="100%" height={10} rounded="full" className="mb-3" />
      {/* Mini Crop Cards */}
      <View className="flex-row gap-2 mb-3.5">
        <Skeleton width="48%" height={56} rounded="lg" />
        <Skeleton width="48%" height={56} rounded="lg" />
      </View>
      {/* Full Plan CTA */}
      <Skeleton width="100%" height={44} rounded="full" />
    </View>
  );
}

/** Mandi Market Prices Skeleton */
export function MandiPricesSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`p-4 bg-white border border-[#183B2B]/[0.06] ${className}`} style={{ borderRadius: radii.card }}>
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton width={140} height={16} rounded="md" />
        <Skeleton width={70} height={20} rounded="full" />
      </View>
      <View className="gap-2.5 mb-3">
        <View className="flex-row items-center justify-between p-2.5 rounded-xl bg-cream/40">
          <View className="gap-1">
            <Skeleton width={80} height={14} rounded="sm" />
            <Skeleton width={60} height={18} rounded="md" />
          </View>
          <Skeleton width={50} height={20} rounded="full" />
        </View>
        <View className="flex-row items-center justify-between p-2.5 rounded-xl bg-cream/40">
          <View className="gap-1">
            <Skeleton width={80} height={14} rounded="sm" />
            <Skeleton width={60} height={18} rounded="md" />
          </View>
          <Skeleton width={50} height={20} rounded="full" />
        </View>
      </View>
      <Skeleton width="100%" height={48} rounded="lg" />
    </View>
  );
}

/** Market Analytics Chart Skeleton */
export function MarketChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`p-4 bg-white border border-[#183B2B]/[0.06] ${className}`} style={{ borderRadius: radii.card }}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row gap-2">
          <Skeleton width={60} height={26} rounded="full" />
          <Skeleton width={60} height={26} rounded="full" />
        </View>
        <Skeleton width={70} height={26} rounded="full" />
      </View>
      <Skeleton width="100%" height={120} rounded="card" className="mb-2" />
      <View className="flex-row justify-between pt-2 border-t border-[#183B2B]/[0.06]">
        <Skeleton width={160} height={12} rounded="sm" />
        <Skeleton width={70} height={16} rounded="full" />
      </View>
    </View>
  );
}

/** Farm Insights Section Skeleton */
export function FarmInsightsSkeleton({ className = "" }: { className?: string }) {
  return (
    <View className={`gap-2.5 ${className}`}>
      <View className="flex-row items-center justify-between mb-1 px-1">
        <Skeleton width={150} height={18} rounded="md" />
        <Skeleton width={60} height={16} rounded="full" />
      </View>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="p-3.5 bg-white border border-[#183B2B]/[0.06] rounded-2xl flex-row items-start gap-3"
        >
          <Skeleton width={38} height={38} rounded="full" />
          <View className="flex-1 gap-1.5">
            <View className="flex-row items-center justify-between">
              <Skeleton width="55%" height={14} rounded="sm" />
              <Skeleton width={50} height={16} rounded="full" />
            </View>
            <Skeleton width="90%" height={12} rounded="sm" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default Skeleton;

