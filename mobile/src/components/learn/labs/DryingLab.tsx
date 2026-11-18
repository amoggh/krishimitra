import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { Sun, PackageCheck, AlertTriangle } from "lucide-react-native";

const CROPS_DRY: Record<string, [number, number]> = {
  groundnut: [38, 8],
  maize: [28, 14],
  paddy: [24, 14],
  ragi: [22, 12],
};

export function DryingLab() {
  const [cropId, setCropId] = useState("groundnut");
  const [days, setDays] = useState(1);
  const [storedResult, setStoredResult] = useState<boolean | null>(null);

  const [m0, safe] = CROPS_DRY[cropId] || [38, 8];
  // Exponential moisture decay curve
  const currentMoisture =
    safe - 3 + (m0 - safe + 3) * Math.exp(-0.42 * days);
  const isSafeToBag = currentMoisture <= safe + 0.1;

  const bagAndStore = () => {
    setStoredResult(isSafeToBag);
  };

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 7: Post-Harvest Drying & Storage
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Moisture Safe Thresholds
        </Text>
      </View>

      {/* Crop Selector */}
      <View className="mb-4 flex-row gap-1.5">
        {[
          ["groundnut", "Groundnut (Safe: 8%)"],
          ["maize", "Maize (Safe: 14%)"],
          ["paddy", "Paddy (Safe: 14%)"],
          ["ragi", "Ragi (Safe: 12%)"],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => {
              setCropId(id);
              setDays(1);
              setStoredResult(null);
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

      {/* Sun Drying Day Controls */}
      <View className="mb-4 rounded-xl bg-cream p-3 border border-borderSubtle">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Sun size={15} color={colors.accent} />
            <Text className="font-sans-bold text-xs text-ink">
              Sun Drying Duration: {days} Days on Tarpaulin
            </Text>
          </View>
          <Text
            className={`font-sans-extrabold text-xs ${
              isSafeToBag ? "text-forest" : "text-danger"
            }`}
          >
            Moisture: {currentMoisture.toFixed(1)}%
          </Text>
        </View>

        <View className="flex-row gap-1">
          {[0, 1, 2, 3, 4, 6].map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                setDays(d);
                setStoredResult(null);
              }}
              className={`flex-1 py-1.5 items-center rounded-lg border ${
                days === d ? "bg-primary border-primary" : "bg-white border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  days === d ? "text-white" : "text-ink"
                }`}
              >
                {d}d
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Moisture Gauge Breakdown */}
      <View className="grid grid-cols-3 gap-2 rounded-xl bg-sage/60 p-3 border border-sage-dark/40 mb-3">
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Harvest Moisture</Text>
          <Text className="font-sans-extrabold text-sm text-ink">{m0}%</Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Current Moisture</Text>
          <Text
            className={`font-sans-extrabold text-sm ${
              isSafeToBag ? "text-forest" : "text-danger"
            }`}
          >
            {currentMoisture.toFixed(1)}%
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Safe Bagging Limit</Text>
          <Text className="font-sans-extrabold text-sm text-primary">
            ≤ {safe}%
          </Text>
        </View>
      </View>

      {/* Bag It Button */}
      <Pressable
        onPress={bagAndStore}
        className="mb-3 rounded-full bg-primary py-2.5 items-center active:bg-primary-dark shadow-2xs"
      >
        <Text className="font-sans-bold text-xs text-white">
          Bag into Gunny Sacks & Store 60 Days
        </Text>
      </Pressable>

      {/* Storage Outcome Verdict */}
      {storedResult !== null && (
        <View
          className={`rounded-xl p-3 border ${
            storedResult
              ? "bg-emerald-50 border-emerald-300"
              : "bg-rose-50 border-rose-300"
          }`}
        >
          <Text
            className={`font-sans-bold text-xs ${
              storedResult ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            {storedResult
              ? "✓ Produce Stays Clean & Marketable!"
              : "⚠ Too Wet: Fungal Mould & Aflatoxin Rot Attack"}
          </Text>
          <Text className="mt-1 font-sans text-xs text-ink-muted">
            {storedResult
              ? `Grain moisture is under the certified ${safe}% threshold. Safe from insect reproduction and fungal growth.`
              : `At ${currentMoisture.toFixed(1)}% moisture, internal sweating breeds Aspergillus flavus mould, causing carcinogenic aflatoxins that lead to total APMC rejection.`}
          </Text>
        </View>
      )}
    </View>
  );
}

export default DryingLab;
