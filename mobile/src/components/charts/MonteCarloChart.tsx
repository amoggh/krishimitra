import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors } from "@/theme/colors";

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  height?: number;
};

/** Monte Carlo profit distribution — uses chart-kit (Expo 52 compatible). */
export function MonteCarloChart({ data, height = 100 }: Props) {
  const width = Dimensions.get("window").width - 64;
  const values = data.length ? data.map((p) => p.y * 100) : [0];

  return (
    <View style={{ height, marginTop: 8 }}>
      <LineChart
        data={{
          labels: [],
          datasets: [{ data: values, strokeWidth: 2 }],
        }}
        width={width}
        height={height}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={false}
        withHorizontalLabels={false}
        chartConfig={{
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          color: () => colors.green,
          fillShadowGradientFrom: colors.greenLight,
          fillShadowGradientTo: colors.white,
          propsForBackgroundLines: { strokeWidth: 0 },
        }}
        bezier
        style={{ borderRadius: 8, marginLeft: -8 }}
      />
    </View>
  );
}
