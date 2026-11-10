import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { MapPin, Navigation, ExternalLink } from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";

type Props = {
  latitude: number;
  longitude: number;
  title?: string;
  height?: number;
};

/**
 * Web-compatible farm location map display.
 * Renders an attractive agricultural preview with coordinates and Google Maps navigation.
 */
export function FarmLocationMap({
  latitude,
  longitude,
  title = "Your Farm",
  height = 140,
}: Props) {
  function handleOpenMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View
      className="overflow-hidden border border-[#183B2B]/[0.08] bg-sage"
      style={[
        {
          height,
          borderRadius: radii.md,
          ...shadows.subtle,
        },
      ]}
    >
      {/* Agricultural grid visual background */}
      <View className="flex-1 items-center justify-center p-3 relative">
        <View className="absolute inset-0 opacity-15">
          <View className="h-full w-full flex-row justify-between">
            <View className="w-1/4 border-r border-primary" />
            <View className="w-1/4 border-r border-primary" />
            <View className="w-1/4 border-r border-primary" />
          </View>
        </View>

        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary shadow-sm mb-1.5">
          <MapPin size={18} color={colors.white} />
        </View>

        <Text className="font-sans-bold text-xs text-ink">{title}</Text>
        <Text className="font-sans text-[11px] text-ink-muted">
          GPS: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </Text>

        <Pressable
          onPress={handleOpenMaps}
          accessibilityRole="button"
          accessibilityLabel="Open in Google Maps"
          className="mt-2 flex-row items-center gap-1 rounded-full bg-white px-3 py-1 border border-primary/20 active:opacity-75"
        >
          <Navigation size={12} color={colors.primary} />
          <Text className="font-sans-bold text-[10px] text-primary">
            Open in Google Maps
          </Text>
          <ExternalLink size={10} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default FarmLocationMap;
