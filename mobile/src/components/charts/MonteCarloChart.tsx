import React, { useState } from "react";
import { Dimensions, LayoutChangeEvent, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors } from "@/theme/tokens";

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  height?: number;
  width?: number;
};

/** Monte Carlo profit distribution — container-aware and responsive across mobile, tablet, and desktop. */
export function MonteCarloChart({ data, height = 110, width: explicitWidth }: Props) {
  const windowWidth = Dimensions.get("window").width;
  const fallbackWidth = Math.max(Math.min(windowWidth - 64, 520), 240);
  const [containerWidth, setContainerWidth] = useState<number>(explicitWidth ?? fallbackWidth);

  function handleLayout(e: LayoutChangeEvent) {
    const measured = Math.floor(e.nativeEvent.layout.width);
    if (measured > 50 && Math.abs(measured - containerWidth) > 5) {
      setContainerWidth(measured);
    }
  }

  const effectiveWidth = explicitWidth ?? containerWidth;
  const values = data && data.length ? data.map((p) => p.y * 100) : [10, 25, 45, 70, 85, 60, 30, 10];

  return (
    <View onLayout={handleLayout} className="w-full overflow-hidden" style={{ height: height + 10, marginTop: 4 }}>
      <LineChart
        data={{
          labels: [],
          datasets: [{ data: values, strokeWidth: 2.2 }],
        }}
        width={effectiveWidth}
        height={height}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={false}
        withHorizontalLabels={false}
        chartConfig={{
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          color: () => colors.primary,
          fillShadowGradientFrom: colors.secondary,
          fillShadowGradientTo: colors.white,
          propsForBackgroundLines: { strokeWidth: 0 },
        }}
        bezier
        style={{ borderRadius: 12, marginLeft: -12 }}
      />
    </View>
  );
}

export default MonteCarloChart;
