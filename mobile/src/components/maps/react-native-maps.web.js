import React from "react";
import { View, Text } from "react-native";

export const MapView = (props) => (
  <View {...props} style={[{ backgroundColor: "#e2e8f0" }, props.style]}>
    {props.children}
  </View>
);

export const Marker = () => null;
export const Callout = () => null;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const Overlay = () => null;

export default MapView;
