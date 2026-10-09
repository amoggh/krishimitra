import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type Props = {
  latitude: number;
  longitude: number;
  title?: string;
  height?: number;
};

/**
 * Web-compatible farm location map display.
 * Renders a rich agricultural preview card with coordinates and external map link.
 */
export function FarmLocationMap({
  latitude,
  longitude,
  title = "Your farm",
  height = 160,
}: Props) {
  function handleOpenMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View
      className="mb-3 overflow-hidden rounded-card border border-green-light/30 bg-green-pale"
      style={{ height }}
    >
      <View className="flex-1 items-center justify-center p-4">
        <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-forest">
          <Text className="text-base">📍</Text>
        </View>
        <Text className="font-sans-bold text-sm text-forest">{title}</Text>
        <Text className="mt-1 text-xs text-ink-muted">
          GPS: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </Text>
        <Pressable
          onPress={handleOpenMaps}
          className="mt-2 rounded-full bg-white/80 px-3 py-1 border border-forest/20 active:opacity-70"
        >
          <Text className="text-[11px] font-sans-bold text-forest">
            Open in Google Maps ↗
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default FarmLocationMap;
