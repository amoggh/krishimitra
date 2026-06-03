import { Platform, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type Props = {
  latitude: number;
  longitude: number;
  title?: string;
  height?: number;
};

/** Native maps; web shows a static placeholder (maps SDK is mobile-only). */
export function FarmLocationMap({
  latitude,
  longitude,
  title = "Your farm",
  height = 160,
}: Props) {
  if (Platform.OS === "web") {
    return (
      <View
        className="mb-3 items-center justify-center rounded-card bg-green-pale"
        style={{ height }}
      >
        <Text className="font-sans-bold text-sm text-forest">{title}</Text>
        <Text className="mt-1 text-xs text-ink-muted">
          {latitude.toFixed(2)}, {longitude.toFixed(2)} · Map on phone build
        </Text>
      </View>
    );
  }

  const MapView = require("react-native-maps").default;
  const { Marker } = require("react-native-maps");

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View className="mb-3 overflow-hidden rounded-card" style={{ height }}>
      <MapView style={{ flex: 1 }} initialRegion={region} mapType="hybrid">
        <Marker coordinate={{ latitude, longitude }} title={title} pinColor={colors.forest} />
      </MapView>
    </View>
  );
}
