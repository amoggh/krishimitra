import React from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors, radii } from "@/theme/tokens";

type Props = {
  latitude: number;
  longitude: number;
  title?: string;
  height?: number;
};

/** Native maps for iOS & Android devices using react-native-maps. */
export function FarmLocationMap({
  latitude,
  longitude,
  title = "Your Farm",
  height = 140,
}: Props) {
  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View
      className="overflow-hidden border border-[#183B2B]/[0.08]"
      style={{ height, borderRadius: radii.md }}
    >
      <MapView style={{ flex: 1 }} initialRegion={region} mapType="hybrid">
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          pinColor={colors.primary}
        />
      </MapView>
    </View>
  );
}

export default FarmLocationMap;
