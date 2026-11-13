import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { CropResult, LandDivisionItem } from "@/types/api";

// A small set of colors assigned to crops in order
export const CROP_COLORS = [
  "#2d8a57", // forest green
  "#c4a35a", // earth / amber
  "#2980b9", // blue
  "#8e44ad", // purple
  "#e67e22", // orange
  "#16a085", // teal
];

/** Convert CropResult[] into LandDivisionItem[] with assigned colors. */
export function toLandDivision(crops: CropResult[]): LandDivisionItem[] {
  return crops.map((c, i) => ({
    crop: c.crop.charAt(0).toUpperCase() + c.crop.slice(1),
    acres: c.area_acres,
    color: CROP_COLORS[i % CROP_COLORS.length],
  }));
}

type Props = { division: LandDivisionItem[] };

export function LandDivisionBar({ division }: Props) {
  if (!division.length) return null;
  const total = division.reduce((sum, d) => sum + d.acres, 0);

  const [hoveredCrop, setHoveredCrop] = useState<string | null>(null);

  // Active crop shown enlarged above the bar: defaults to primary crop when idle
  const activeItem =
    division.find((d) => d.crop.toLowerCase() === hoveredCrop?.toLowerCase()) ??
    division[0];
  const activePercentage =
    total > 0 ? ((activeItem.acres / total) * 100).toFixed(0) : "0";

  return (
    <View className="mb-4">
      {/* ── Enlarged crop preview above the bar with matching background color ── */}
      <View
        style={{
          backgroundColor: activeItem.color,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 16,
          marginBottom: 8,
          shadowColor: activeItem.color,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.28,
          shadowRadius: 8,
          elevation: 3,
        }}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-white/90" />
          <Text className="font-sans-extrabold text-base text-white tracking-wide">
            {activeItem.crop}
          </Text>
          <View className="rounded-full bg-black/20 px-2.5 py-0.5">
            <Text className="font-sans-bold text-xs text-white">
              {activePercentage}% of total land
            </Text>
          </View>
        </View>
        <Text className="font-sans-extrabold text-sm text-white">
          {activeItem.acres.toFixed(2)} acres
        </Text>
      </View>

      {/* ── Original clean land division bar ── */}
      <View className="overflow-hidden rounded-xl">
        <View className="h-14 flex-row">
          {division.map((item) => {
            const isHovered =
              hoveredCrop?.toLowerCase() === item.crop.toLowerCase();

            return (
              <Pressable
                key={item.crop}
                onHoverIn={() => setHoveredCrop(item.crop)}
                onHoverOut={() => setHoveredCrop(null)}
                onPress={() => setHoveredCrop(item.crop)}
                style={[
                  {
                    width: `${(item.acres / total) * 100}%`,
                    backgroundColor: item.color,
                    opacity: hoveredCrop && !isHovered ? 0.75 : 1.0,
                  },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any),
                ]}
                className="items-center justify-center px-1"
              >
                <Text className="text-center font-sans-bold text-[9px] text-white">
                  {item.crop}
                </Text>
                <Text className="text-center font-sans-bold text-[9px] text-white">
                  {item.acres.toFixed(1)} ac
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
