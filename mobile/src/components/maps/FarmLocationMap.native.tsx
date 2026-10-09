import React from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors } from "@/theme/colors";

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
  title = "Your farm",
  height = 160,
}: Props) {
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

export default FarmLocationMap;
