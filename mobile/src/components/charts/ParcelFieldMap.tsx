import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Rect, Line, G, Text as SvgText, Pattern, Defs } from "react-native-svg";
import { colors } from "@/theme/tokens";

export interface ParcelCrop {
  crop: {
    id: string;
    name: string;
    kn?: string;
    hue: string;
  };
  acres: number;
}

export interface ParcelFieldMapProps {
  crops: ParcelCrop[];
  fallowAcres?: number;
  totalAcres: number;
  onCropSelect?: (cropId: string) => void;
  selectedCropId?: string | null;
  width?: number;
  height?: number;
}

interface SlicedRect {
  id: string;
  name: string;
  kn?: string;
  hue: string;
  acres: number;
  fallow?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

function slice(
  items: Array<{ v: number; hue: string; name: string; kn?: string; acres: number; id: string; fallow?: boolean }>,
  x: number,
  y: number,
  w: number,
  h: number,
  out: SlicedRect[]
) {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h });
    return;
  }
  const total = items.reduce((t, i) => t + i.v, 0);
  let acc = 0;
  let k = 0;
  while (k < items.length - 1 && acc + items[k].v <= total / 2) {
    acc += items[k].v;
    k++;
  }
  if (k === 0) {
    acc = items[0].v;
    k = 1;
  }
  const a = items.slice(0, k);
  const b = items.slice(k);
  const fa = total > 0 ? acc / total : 0.5;

  if (w >= h) {
    slice(a, x, y, w * fa, h, out);
    slice(b, x + w * fa, y, w * (1 - fa), h, out);
  } else {
    slice(a, x, y, w, h * fa, out);
    slice(b, x, y + h * fa, w, h * (1 - fa), out);
  }
}

export function ParcelFieldMap({
  crops,
  fallowAcres = 0,
  totalAcres,
  onCropSelect,
  selectedCropId,
  height = 240,
}: ParcelFieldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeId = selectedCropId || hoveredId;

  const W = 600;
  const H = 340;

  const items: Array<{
    v: number;
    hue: string;
    name: string;
    kn?: string;
    acres: number;
    id: string;
    fallow?: boolean;
  }> = crops.map((c) => ({
    v: c.acres,
    hue: c.crop.hue || colors.primary,
    name: c.crop.name.split(" (")[0],
    kn: c.crop.kn,
    acres: c.acres,
    id: c.crop.id,
  }));

  if (fallowAcres > 0) {
    items.push({
      v: fallowAcres,
      hue: "#9AA08F",
      name: "Fallow",
      kn: "ಬಂಜರು",
      acres: fallowAcres,
      id: "fallow",
      fallow: true,
    });
  }

  const rects: SlicedRect[] = [];
  slice(items, 6, 6, W - 12, H - 12, rects);

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-3 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Field Land Partition Map
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          {totalAcres.toFixed(2)} Acres Total · N ↑
        </Text>
      </View>

      <View style={{ height, width: "100%" }}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {rects.map((r) => {
            const isSelected = activeId === r.id;
            const isDimmed = Boolean(activeId && !isSelected);
            const showLabel = r.w > 75 && r.h > 45;

            return (
              <G
                key={r.id}
                opacity={isDimmed ? 0.35 : 1}
                onPress={() => onCropSelect?.(r.id)}
              >
                {/* Parcel Boundary */}
                <Rect
                  x={r.x + 2}
                  y={r.y + 2}
                  width={Math.max(4, r.w - 4)}
                  height={Math.max(4, r.h - 4)}
                  rx={10}
                  fill={r.hue}
                  fillOpacity={r.fallow ? 0.25 : isSelected ? 0.95 : 0.8}
                  stroke={isSelected ? "#183B2B" : "#FFFFFF"}
                  strokeWidth={isSelected ? 3 : 1.5}
                />

                {/* Land Furrow Accent Lines */}
                <Line
                  x1={r.x + 8}
                  y1={r.y + r.h * 0.5}
                  x2={r.x + r.w - 8}
                  y2={r.y + r.h * 0.5}
                  stroke="#FFFFFF"
                  strokeOpacity={0.25}
                  strokeWidth={1}
                  strokeDasharray="4, 4"
                />

                {/* Crop Name & Acreage Pill */}
                {showLabel && (
                  <G transform={`translate(${r.x + 10}, ${r.y + 10})`}>
                    <Rect
                      x={0}
                      y={0}
                      width={Math.min(r.w - 20, 160)}
                      height={44}
                      rx={8}
                      fill="#FFFFFF"
                      fillOpacity={0.92}
                    />
                    <SvgText
                      x={10}
                      y={18}
                      fontFamily="Manrope, sans-serif"
                      fontSize={13}
                      fontWeight="bold"
                      fill="#183B2B"
                    >
                      {r.name.length > 15 ? r.name.slice(0, 14) + "…" : r.name}
                    </SvgText>
                    <SvgText
                      x={10}
                      y={34}
                      fontFamily="Manrope, sans-serif"
                      fontSize={11}
                      fill="#718078"
                    >
                      {r.acres} {r.acres === 1 ? "acre" : "acres"}
                      {r.kn ? ` · ${r.kn}` : ""}
                    </SvgText>
                  </G>
                )}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend Chips */}
      <View className="mt-3 flex-row flex-wrap gap-2">
        {rects.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onCropSelect?.(r.id)}
            className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 border transition-all ${
              activeId === r.id
                ? "bg-sage border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: r.hue }}
            />
            <Text className="font-sans-bold text-xs text-ink">
              {r.name}
            </Text>
            <Text className="font-sans text-[10px] text-ink-muted">
              ({r.acres} ac)
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default ParcelFieldMap;
