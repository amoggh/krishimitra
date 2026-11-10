import React, { useState } from "react";
import { Dimensions, LayoutChangeEvent, View, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors, radii, shadows } from "@/theme/tokens";

type Props = {
  data: number[];
  height?: number;
  width?: number;
};

export function PriceTrendChart({ data, height = 130, width: explicitWidth }: Props) {
  const windowWidth = Dimensions.get("window").width;
  const fallbackWidth = Math.max(Math.min(windowWidth - 48, 520), 240);
  const [containerWidth, setContainerWidth] = useState<number>(explicitWidth ?? fallbackWidth);
  const [selectedPoint, setSelectedPoint] = useState<{ value: number; index: number } | null>(null);

  function handleLayout(e: LayoutChangeEvent) {
    const measured = Math.floor(e.nativeEvent.layout.width);
    if (measured > 50 && Math.abs(measured - containerWidth) > 5) {
      setContainerWidth(measured);
    }
  }

  const effectiveWidth = explicitWidth ?? containerWidth;
  const safeData = data && data.length ? data : [3200, 3250, 3300, 3350, 3400, 3420, 3450];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View onLayout={handleLayout} className="w-full overflow-hidden">
      {/* Interactive Tooltip Overlay */}
      {selectedPoint && (
        <View className="mb-1.5 flex-row items-center justify-between px-1">
          <Text className="font-sans text-[11px] text-ink-muted">
            {dayLabels[selectedPoint.index] || "Day"}:
          </Text>
          <View className="flex-row items-center gap-1 rounded-full bg-primary px-2.5 py-0.5">
            <Text className="font-sans-bold text-xs text-white">
              ₹{selectedPoint.value.toLocaleString("en-IN")}/qtl
            </Text>
          </View>
        </View>
      )}

      <LineChart
        data={{
          labels: ["M", "T", "W", "T", "F", "S", "S"],
          datasets: [{ data: safeData, strokeWidth: 2.2 }],
        }}
        width={effectiveWidth}
        height={height}
        chartConfig={{
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          color: () => colors.primary,
          labelColor: () => colors.textSecondary,
          propsForDots: { r: "4", strokeWidth: "1.5", stroke: colors.primaryDark },
        }}
        onDataPointClick={({ value, index }) => {
          setSelectedPoint({ value, index });
        }}
        bezier
        style={{ borderRadius: 12, marginLeft: -10 }}
      />
    </View>
  );
}

export default PriceTrendChart;
