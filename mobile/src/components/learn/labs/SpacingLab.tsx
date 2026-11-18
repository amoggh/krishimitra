import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";

const SP: Record<string, [number, number]> = {
  maize: [60, 20],
  ragi: [25, 10],
  tur: [120, 30],
  sunflower: [60, 30],
};

export function SpacingLab() {
  const [cropId, setCropId] = useState("maize");
  const [scale, setScale] = useState(1.0); // 0.5 to 2.0

  const [rowBase, plantBase] = SP[cropId] || [60, 20];
  const r = rowBase * scale;
  const p = plantBase * scale;
  const plantsPerAcre = 40470000 / (r * p);
  const relYield = Math.max(0.2, 1 - 0.9 * Math.pow(Math.log(scale), 2));

  const isCrowded = scale < 0.78;
  const isSparse = scale > 1.35;

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 4: Spacing Decides Yield
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Plant Density Calculator
        </Text>
      </View>

      {/* Crop Selector */}
      <View className="mb-4 flex-row gap-1.5">
        {[
          ["maize", "Maize (60×20 cm)"],
          ["ragi", "Ragi (25×10 cm)"],
          ["tur", "Tur (120×30 cm)"],
          ["sunflower", "Sunflower (60×30 cm)"],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => {
              setCropId(id);
              setScale(1.0);
            }}
            className={`flex-1 rounded-xl py-1.5 px-1 items-center border transition-all ${
              cropId === id
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-[11px] ${
                cropId === id ? "text-white" : "text-ink"
              }`}
            >
              {label.split(" ")[0]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Spacing Adjustment Slider Buttons */}
      <View className="mb-4 rounded-xl bg-cream p-3 border border-borderSubtle">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-sans text-xs text-ink-muted">
            Spacing vs Benchmark:{" "}
            <Text className="font-sans-bold text-ink">
              {Math.round(scale * 100)}% ({Math.round(r)} × {Math.round(p)} cm)
            </Text>
          </Text>
          <Text className="font-sans-bold text-xs text-forest">
            {Math.round(relYield * 100)}% Est. Yield
          </Text>
        </View>

        <View className="flex-row gap-1">
          {[0.6, 0.8, 1.0, 1.25, 1.6].map((s) => (
            <Pressable
              key={s}
              onPress={() => setScale(s)}
              className={`flex-1 rounded-lg py-1.5 items-center border ${
                scale === s ? "bg-primary border-primary" : "bg-white border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  scale === s ? "text-white" : "text-ink"
                }`}
              >
                {Math.round(s * 100)}%
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Metrics Card */}
      <View className="grid grid-cols-3 gap-2 rounded-xl bg-sage/60 p-3 border border-sage-dark/40 mb-3">
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Row × Plant</Text>
          <Text className="font-sans-extrabold text-sm text-ink">
            {Math.round(r)} × {Math.round(p)} cm
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Plants / Acre</Text>
          <Text className="font-sans-extrabold text-sm text-forest">
            {Math.round(plantsPerAcre).toLocaleString("en-IN")}
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Canopy Status</Text>
          <Text
            className={`font-sans-bold text-xs ${
              isCrowded ? "text-danger" : isSparse ? "text-amber-600" : "text-primary"
            }`}
          >
            {isCrowded ? "Too Crowded" : isSparse ? "Too Sparse" : "Optimal"}
          </Text>
        </View>
      </View>

      <View className="rounded-xl bg-white p-3 border border-borderSubtle">
        <Text className="font-sans text-xs text-ink-muted">
          {isCrowded
            ? "Leaves overlap heavily and stay damp. Disease spreads rapidly and plants lodge in wind."
            : isSparse
            ? "Bare soil between rows invites weeds and wastes fertilizer on uncultivated land."
            : "Canopy closes comfortably: maximizes sun capture and suppresses weeds without crowding."}
        </Text>
      </View>
    </View>
  );
}

export default SpacingLab;
