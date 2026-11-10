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
 * Renders real interactive maps:
 * - Uses Google Maps Embed (Satellite/Hybrid) when EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is configured in .env
 * - Uses OpenStreetMap real interactive tiles as an immediate zero-key fallback
 * - Provides direct one-tap navigation to Google Maps
 */
export function FarmLocationMap({
  latitude,
  longitude,
  title = "Your Farm",
  height = 140,
}: Props) {
  const googleMapsKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (typeof window !== "undefined" ? (window as any).EXPO_PUBLIC_GOOGLE_MAPS_API_KEY : "");

  const hasValidGoogleKey =
    Boolean(googleMapsKey) &&
    googleMapsKey !== "YOUR_GOOGLE_MAPS_API_KEY" &&
    !googleMapsKey.startsWith("AIzaSyFake");

  function handleOpenMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {});
  }

  // Bounding box for live OpenStreetMap embed
  const delta = 0.018;
  const bbox = `${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}`;

  const mapEmbedUrl = hasValidGoogleKey
    ? `https://www.google.com/maps/embed/v1/view?key=${googleMapsKey}&center=${latitude},${longitude}&zoom=14&maptype=satellite`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <View
      className="overflow-hidden border border-[#183B2B]/[0.08] bg-sage relative"
      style={[
        {
          height,
          borderRadius: radii.md,
          ...shadows.subtle,
        },
      ]}
    >
      {/* Real Interactive Map Iframe */}
      {typeof window !== "undefined" ? (
        <iframe
          title={title}
          width="100%"
          height={height}
          style={{ border: 0, display: "block" }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={mapEmbedUrl}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-3">
          <MapPin size={22} color={colors.primary} />
          <Text className="font-sans-bold text-xs text-ink mt-1">{title}</Text>
        </View>
      )}

      {/* Floating GPS & Navigation Badge */}
      <View
        className="absolute bottom-2 right-2 flex-row items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 border border-primary/20 shadow-xs"
        style={{ pointerEvents: "box-none" }}
      >
        <Pressable
          onPress={handleOpenMaps}
          accessibilityRole="button"
          accessibilityLabel="Open coordinates in Google Maps"
          className="flex-row items-center gap-1 active:opacity-75"
        >
          <Navigation size={11} color={colors.primary} />
          <Text className="font-sans-bold text-[10px] text-primary">
            {hasValidGoogleKey ? "Google Maps" : "Open Maps"}
          </Text>
          <ExternalLink size={9} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default FarmLocationMap;
