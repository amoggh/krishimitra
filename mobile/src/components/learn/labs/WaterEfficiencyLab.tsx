import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { Droplets, Gauge } from "lucide-react-native";

const PUMP_LPH: Record<number, [number, number]> = {
  1: [500, 800],
  2: [1000, 1600],
  3: [1500, 2400],
  5: [2500, 4000],
  7.5: [3750, 6000],
  10: [5000, 8000],
};

const EFF: Record<string, number> = {
  flood: 0.55,
  sprinkler: 0.8,
  drip: 0.92,
};

export function WaterEfficiencyLab() {
  const [method, setMethod] = useState<"flood" | "sprinkler" | "drip">("drip");
  const [hp, setHp] = useState(5);
  const [hours, setHours] = useState(6);

  const eff = EFF[method];
  const [lo, hi] = PUMP_LPH[hp] || [2500, 4000];
  const dailyPumped = ((lo + hi) / 2) * hours;
  const reachesRoots = dailyPumped * eff;
  const depthMmOnOneAcre = reachesRoots / 4047;
  const hoursFor25mm = (25 * 4047) / (((lo + hi) / 2) * eff);

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 2: Where Does The Water Go?
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Irrigation Method Efficiency
        </Text>
      </View>

      {/* Irrigation Method Selector */}
      <View className="mb-4 flex-row gap-2">
        {[
          ["flood", "Flood (55% Eff.)"],
          ["sprinkler", "Sprinkler (80% Eff.)"],
          ["drip", "Drip (92% Eff.)"],
        ].map(([val, label]) => (
          <Pressable
            key={val}
            onPress={() => setMethod(val as any)}
            className={`flex-1 rounded-xl py-2 px-2 items-center border transition-all ${
              method === val
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                method === val ? "text-white" : "text-ink"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Visual Efficiency Water Distribution Bar */}
      <View className="mb-4 rounded-xl bg-cream p-3 border border-borderSubtle">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-sans-bold text-[10px] uppercase text-ink-muted">
            Water Destination Breakdown
          </Text>
          <Text className="font-sans-bold text-xs text-forest">
            {(eff * 100).toFixed(0)}% Reaches Crop Root Zone
          </Text>
        </View>

        <View className="h-6 w-full flex-row overflow-hidden rounded-full bg-stone-200">
          <View
            style={{ width: `${eff * 100}%` }}
            className="bg-[#145C3A] items-center justify-center"
          >
            <Text className="font-sans-bold text-[10px] text-white">
              Root Zone {(eff * 100).toFixed(0)}%
            </Text>
          </View>
          <View
            style={{ width: `${(1 - eff) * 50}%` }}
            className="bg-[#E9B44C] items-center justify-center"
          >
            <Text className="font-sans text-[8px] text-ink">Evap</Text>
          </View>
          <View
            style={{ width: `${(1 - eff) * 50}%` }}
            className="bg-[#C0392B] items-center justify-center"
          >
            <Text className="font-sans text-[8px] text-white">Deep</Text>
          </View>
        </View>
        <Text className="mt-2 font-sans text-[10px] text-ink-muted text-center">
          Green: Root Zone · Gold: Evaporates into air · Red: Percolates below roots
        </Text>
      </View>

      {/* Controls: Pump HP & Hours */}
      <View className="grid grid-cols-2 gap-3 mb-4">
        <View className="rounded-xl bg-cream p-3 border border-borderSubtle">
          <Text className="font-sans text-xs text-ink-muted mb-1.5">Pump Size:</Text>
          <View className="flex-row flex-wrap gap-1">
            {[2, 3, 5, 7.5].map((h) => (
              <Pressable
                key={h}
                onPress={() => setHp(h)}
                className={`rounded-lg px-2.5 py-1 border ${
                  hp === h ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    hp === h ? "text-white" : "text-ink"
                  }`}
                >
                  {h} HP
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="rounded-xl bg-cream p-3 border border-borderSubtle">
          <Text className="font-sans text-xs text-ink-muted mb-1.5">Daily Pumping Hours:</Text>
          <View className="flex-row flex-wrap gap-1">
            {[4, 6, 8, 10].map((hr) => (
              <Pressable
                key={hr}
                onPress={() => setHours(hr)}
                className={`rounded-lg px-2.5 py-1 border ${
                  hours === hr ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    hours === hr ? "text-white" : "text-ink"
                  }`}
                >
                  {hr} h
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Calculated Stats */}
      <View className="grid grid-cols-3 gap-2 rounded-xl bg-sage/60 p-3 border border-sage-dark/40 mb-3">
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Pumped / Day</Text>
          <Text className="font-sans-extrabold text-xs text-ink">
            {Math.round(dailyPumped).toLocaleString("en-IN")} L
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Root Effective</Text>
          <Text className="font-sans-extrabold text-xs text-forest">
            {Math.round(reachesRoots).toLocaleString("en-IN")} L
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Depth on 1 Acre</Text>
          <Text className="font-sans-extrabold text-xs text-primary">
            {depthMmOnOneAcre.toFixed(1)} mm/day
          </Text>
        </View>
      </View>

      <Text className="font-sans text-xs text-ink-muted">
        A single 25 mm watering on 1 acre takes approximately{" "}
        <Text className="font-sans-bold text-ink">
          {hoursFor25mm.toFixed(1)} pump-hours
        </Text>{" "}
        with {method} irrigation.
      </Text>
    </View>
  );
}

export default WaterEfficiencyLab;
