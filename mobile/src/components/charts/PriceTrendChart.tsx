import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors } from "@/theme/colors";

type Props = {
  data: number[];
  height?: number;
};

export function PriceTrendChart({ data, height = 120 }: Props) {
  const width = Dimensions.get("window").width - 48;

  return (
    <View>
      <LineChart
        data={{
          labels: ["M", "T", "W", "T", "F", "S", "S"],
          datasets: [{ data, strokeWidth: 2 }],
        }}
        width={width}
        height={height}
        chartConfig={{
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          color: () => colors.green,
          labelColor: () => colors.inkLight,
          propsForDots: { r: "3", strokeWidth: "1", stroke: colors.forest },
        }}
        bezier
        style={{ borderRadius: 12, marginLeft: -8 }}
      />
    </View>
  );
}
