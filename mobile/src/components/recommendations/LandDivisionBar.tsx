import { Text, View } from "react-native";
import type { CropResult, LandDivisionItem } from "@/types/api";

// A small set of colors assigned to crops in order
const CROP_COLORS = [
  "#2d8a57", // forest green
  "#c4a35a", // earth
  "#2980b9", // blue
  "#8e44ad", // purple
  "#e67e22", // orange
  "#16a085", // teal
];

const FALLOW_COLOR = "#a8a29e"; // stone grey

/** Convert CropResult[] into LandDivisionItem[] with assigned colors, plus any fallow land. */
export function toLandDivision(crops: CropResult[], fallowAcres = 0): LandDivisionItem[] {
  const items = crops.map((c, i) => ({
    crop: c.crop.charAt(0).toUpperCase() + c.crop.slice(1),
    acres: c.area_acres,
    color: CROP_COLORS[i % CROP_COLORS.length],
  }));
  if (crops.length && fallowAcres > 0.01) {
    items.push({ crop: "Fallow (water)", acres: fallowAcres, color: FALLOW_COLOR });
  }
  return items;
}

type Props = { division: LandDivisionItem[] };

export function LandDivisionBar({ division }: Props) {
  if (!division.length) return null;
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
              {item.acres.toFixed(1)} ac
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
