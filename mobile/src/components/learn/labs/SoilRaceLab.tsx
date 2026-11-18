import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { CROPS } from "@/data/cropsData";

const SOILS = [
  { n: "Red sandy loam", c: "#B5613A", rate: 25, awc: 90, note: "Drains in hours. Water often, in small amounts." },
  { n: "Laterite", c: "#96492B", rate: 18, awc: 100, note: "Porous and acidic. Needs organic matter to hold anything." },
  { n: "Red loamy", c: "#9C5A3C", rate: 12, awc: 130, note: "The balanced one. Holds enough and still breathes." },
  { n: "Black cotton", c: "#3A322C", rate: 3, awc: 190, note: "Holds water for weeks, cracks when dry, floods if over-watered." },
];

export function SoilRaceLab() {
  const [selectedSoilIdx, setSelectedSoilIdx] = useState(3);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setElapsedHours((h) => {
        if (h >= 36) {
          setIsPlaying(false);
          return 36;
        }
        return h + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const s = SOILS[selectedSoilIdx];
  const fits = CROPS.filter((c) => c.good.includes(s.n)).map((c) => c.name.split(" (")[0]);

  const pourAgain = () => {
    setElapsedHours(0);
    setIsPlaying(true);
  };

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 1: The Soil Race
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Pour 100 mm on Four Soils
        </Text>
      </View>

      {/* Soil Type Selector */}
      <View className="mb-4 flex-row flex-wrap gap-1.5">
        {SOILS.map((soil, idx) => (
          <Pressable
            key={soil.n}
            onPress={() => {
              setSelectedSoilIdx(idx);
              setElapsedHours(0);
            }}
            className={`rounded-full px-3 py-1 border transition-all ${
              selectedSoilIdx === idx
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                selectedSoilIdx === idx ? "text-white" : "text-ink"
              }`}
            >
              {soil.n}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Visual Soil Columns Comparison */}
      <View className="grid grid-cols-4 gap-2 h-44 mb-3">
        {SOILS.map((soil, idx) => {
          const soakHours = 100 / soil.rate;
          const isDone = elapsedHours >= soakHours;
          const soakProgress = Math.min(1, elapsedHours / soakHours);
          const depthCm = Math.round((100 / soil.awc) * 100);
          const isSelected = selectedSoilIdx === idx;

          return (
            <View
              key={soil.n}
              className={`relative overflow-hidden rounded-xl border flex-col justify-between p-2 ${
                isSelected ? "border-primary ring-2 ring-primary/30" : "border-borderSubtle"
              }`}
              style={{ backgroundColor: soil.c }}
            >
              {/* Soaking Water Overlay */}
              <View
                className="absolute top-0 left-0 right-0 bg-[#3A86A8]/50 transition-all"
                style={{ height: `${soakProgress * 100}%` }}
              />

              <View className="relative z-10">
                <Text
                  className="font-sans-bold text-[10px] text-white"
                  numberOfLines={1}
                >
                  {soil.n.split(" ")[0]}
                </Text>
                <Text className="font-sans text-[9px] text-white/80">
                  {soil.rate} mm/h
                </Text>
              </View>

              <View className="relative z-10 rounded bg-black/40 px-1 py-0.5 items-center">
                <Text className="font-sans-bold text-[9px] text-white">
                  {isDone ? `${Math.round(soakHours)}h Done` : `${Math.round(soakProgress * 100)}%`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Controls & Metrics */}
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable
          onPress={pourAgain}
          className="rounded-full bg-primary px-3.5 py-1.5 active:bg-primary-dark shadow-2xs"
        >
          <Text className="font-sans-bold text-xs text-white">
            {elapsedHours === 0 ? "Pour 100 mm" : "Pour Again"}
          </Text>
        </Pressable>
        <Text className="font-sans text-xs text-ink-muted">
          Elapsed: {elapsedHours} hours
        </Text>
      </View>

      <View className="grid grid-cols-3 gap-2 rounded-xl bg-cream p-3 border border-borderSubtle mb-3">
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Infiltration Rate</Text>
          <Text className="font-sans-extrabold text-sm text-ink">{s.rate} mm/h</Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Holds per Metre</Text>
          <Text className="font-sans-extrabold text-sm text-ink">{s.awc} mm</Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">100 mm Wets</Text>
          <Text className="font-sans-extrabold text-sm text-forest">
            {Math.round((100 / s.awc) * 100)} cm deep
          </Text>
        </View>
      </View>

      <View className="rounded-xl bg-sage/60 p-3 border border-sage-dark/40">
        <Text className="font-sans text-xs text-ink">
          <Text className="font-sans-bold text-primary">{s.note} </Text>
          Recommended crops here: {fits.join(", ") || "Few benchmark crops"}.
        </Text>
      </View>
    </View>
  );
}

export default SoilRaceLab;
