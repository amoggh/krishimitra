import { Text, View } from "react-native";
import type { RecommendationResult } from "@/types/api";

type Props = { division: RecommendationResult["land_division"] };

export function LandDivisionBar({ division }: Props) {
  const total = division.reduce((sum, d) => sum + d.acres, 0);

  return (
    <View className="mb-3 overflow-hidden rounded-xl">
      <View className="h-14 flex-row">
        {division.map((item) => (
          <View
            key={item.crop}
            style={{
              width: `${(item.acres / total) * 100}%`,
              backgroundColor: item.color,
            }}
            className="items-center justify-center px-1"
          >
            <Text className="text-center font-sans-bold text-[9px] text-white">
              {item.crop}
            </Text>
            <Text className="text-center font-sans-bold text-[9px] text-white">
              {item.acres} ac
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
