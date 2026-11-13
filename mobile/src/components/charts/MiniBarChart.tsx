import React, { useState } from "react";
import { Dimensions, LayoutChangeEvent, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { colors } from "@/theme/tokens";

type Props = {
  data: number[];
  height?: number;
  barColor?: string;
  width?: number;
};

export function MiniBarChart({
  data,
  height = 54,
  barColor = colors.primary,
  width: explicitWidth,
}: Props) {
  const windowWidth = Dimensions.get("window").width;
  const fallbackWidth = Math.max(Math.min(windowWidth - 64, 480), 220);
  const [containerWidth, setContainerWidth] = useState<number>(explicitWidth ?? fallbackWidth);

  function handleLayout(e: LayoutChangeEvent) {
    const measured = Math.floor(e.nativeEvent.layout.width);
    if (measured > 50 && Math.abs(measured - containerWidth) > 5) {
      setContainerWidth(measured);
    }
  }

  const effectiveWidth = explicitWidth ?? containerWidth;

  return (
    <View onLayout={handleLayout} className="w-full mt-1.5 overflow-hidden">
      <BarChart
        data={{
          labels: [],
          datasets: [{ data: data.length ? data : [0] }],
        }}
        width={effectiveWidth}
        height={height}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          color: () => barColor,
          labelColor: () => colors.textSecondary,
          barPercentage: 0.6,
          propsForBackgroundLines: { strokeWidth: 0 },
        }}
        withHorizontalLabels={false}
        withVerticalLabels={false}
        showBarTops={false}
        fromZero
        style={{ borderRadius: 8, marginLeft: -12 }}
      />
    </View>
  );
}

export default MiniBarChart;
