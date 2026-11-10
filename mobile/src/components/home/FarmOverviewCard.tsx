import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import {
  MapPin,
  Calendar,
  Layers,
  Droplets,
  ExternalLink,
  Navigation,
  Sprout,
} from "lucide-react-native";
import { Card, Badge } from "@/components/ui";
import { FarmLocationMap } from "@/components/maps/FarmLocationMap";
import { colors, radii } from "@/theme/tokens";

export type FarmOverviewCardProps = {
  location: string;
  district: string;
  totalAcres: number;
  season?: string;
  activeCrops?: { name: string; acres: number }[];
  latitude: number;
  longitude: number;
  soilType?: string;
  soilPh?: number;
  waterBudgetMm?: number;
  className?: string;
};

export function FarmOverviewCard({
  location,
  district,
  totalAcres,
  season = "Kharif 2026",
  activeCrops = [],
  latitude,
  longitude,
  soilType = "Red sandy loam",
  soilPh = 6.8,
  waterBudgetMm = 561,
  className = "",
}: FarmOverviewCardProps) {
  function handleOpenMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Card className={`p-4 border border-[#183B2B]/[0.06] ${className}`}>
      {/* Top Header: Location, Season & Acreage Badges */}
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-1.5">
            <MapPin size={16} color={colors.primary} />
            <Text className="font-sans-bold text-base text-ink tracking-tight">
              {location}
            </Text>
          </View>
          <Text className="mt-0.5 font-sans text-xs text-ink-muted">
            {totalAcres.toFixed(1)} acres total farm land · {district}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Badge label={season} tone="gold" size="sm" />
          <Badge label={`${totalAcres.toFixed(1)} ac`} tone="success" size="sm" />
        </View>
      </View>

      {/* Active Crops Chips if available */}
      {activeCrops.length > 0 && (
        <View className="mb-3 flex-row flex-wrap items-center gap-1.5">
          <Text className="font-sans-bold text-[11px] uppercase tracking-wider text-ink-muted mr-1">
            Active Crops:
          </Text>
          {activeCrops.map((c, i) => (
            <View
              key={i}
              className="flex-row items-center gap-1 rounded-full bg-sage px-2.5 py-0.5"
            >
              <Sprout size={11} color={colors.primary} />
              <Text className="font-sans-bold text-[11px] text-primary">
                {c.name} ({c.acres.toFixed(1)} ac)
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Compact Interactive Farm Map Preview */}
      <View className="mb-3 overflow-hidden rounded-xl">
        <FarmLocationMap
          latitude={latitude}
          longitude={longitude}
          title={`${district} Farm`}
          height={125}
        />
      </View>

      {/* Footer Details: Soil & Water budget & Navigation button */}
      <View className="flex-row items-center justify-between pt-2.5 border-t border-cream-muted/50">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Layers size={13} color={colors.primary} />
            <Text className="font-sans text-[11px] text-ink-muted">
              {soilType} · pH {soilPh}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Droplets size={13} color={colors.info} />
            <Text className="font-sans text-[11px] text-ink-muted">
              {waterBudgetMm} mm budget
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleOpenMaps}
          accessibilityRole="button"
          accessibilityLabel="Google Maps directions"
          className="flex-row items-center gap-1 rounded-full bg-cream px-2.5 py-1 active:bg-cream-dark"
        >
          <Navigation size={11} color={colors.primary} />
          <Text className="font-sans-bold text-[10px] text-primary">Maps</Text>
          <ExternalLink size={10} color={colors.primary} />
        </Pressable>
      </View>
    </Card>
  );
}

export default FarmOverviewCard;

