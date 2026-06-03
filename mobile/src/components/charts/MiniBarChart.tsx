import { Dimensions, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { colors } from "@/theme/colors";

type Props = {
  data: number[];
  height?: number;
  barColor?: string;
};

export function MiniBarChart({
  data,
  height = 48,
  barColor = colors.green,
}: Props) {
  const width = Dimensions.get("window").width - 64;

  return (
    <View className="mt-2">
      <BarChart
        data={{
          labels: [],
          datasets: [{ data: data.length ? data : [0] }],
        }}
        width={width}
        height={height}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          color: () => barColor,
          labelColor: () => colors.inkLight,
          barPercentage: 0.6,
          propsForBackgroundLines: { strokeWidth: 0 },
        }}
        withHorizontalLabels={false}
        withVerticalLabels={false}
        showBarTops={false}
        fromZero
        style={{ borderRadius: 8, marginLeft: -16 }}
      />
    </View>
  );
}
