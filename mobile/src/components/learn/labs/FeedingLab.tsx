import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { ProceduralPlant } from "@/components/animation/ProceduralPlant";

export function FeedingLab() {
  const [n, setN] = useState(100);
  const [p, setP] = useState(100);
  const [k, setK] = useState(100);
  const [splitUrea, setSplitUrea] = useState(true);

  // Liebig's law response curve
  const f = (x: number) =>
    x <= 100 ? 0.35 + (0.65 * x) / 100 : 1 - (0.3 * (x - 100)) / 100;
  const relYield = Math.min(f(n), f(p), f(k));

  const notes: string[] = [];
  if (n < 65) notes.push("Low Nitrogen (N): Older lower leaves turn pale yellow.");
  if (n > 145) notes.push("Excess Nitrogen: Lush soft foliage, heavy pest attacks, weak stems.");
  if (p < 65) notes.push("Low Phosphorus (P): Stunted roots, purplish leaves, poor tillering.");
  if (k < 65) notes.push("Low Potassium (K): Leaf margins scorch brown, shrivelled grain filling.");
  if (!notes.length) notes.push("Balanced N-P-K: Foliage, root depth, and grain filling are well-fed.");

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 5: Liebig's Law of the Minimum
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Plant Nutrition Simulator
        </Text>
      </View>

      <View className="flex-col md:flex-row gap-4 mb-4">
        {/* Plant Visual Feedback */}
        <View className="items-center justify-center p-2 rounded-xl bg-cream border border-borderSubtle">
          <ProceduralPlant
            growth={0.88}
            kind="grass"
            heightScale={0.6 + Math.min(1.4, n / 100) * 0.4}
            roots={0.3 + Math.min(1.4, p / 100) * 0.7}
            fruit={Math.min(1.1, k / 100)}
            yellow={n < 100 ? ((100 - n) / 100) * 0.8 : 0}
            purple={p < 65 ? (65 - p) / 65 : 0}
            scorch={k < 65 ? (65 - k) / 65 : 0}
            tilt={n > 145 ? (n - 145) * 0.3 : 0}
            pests={n > 130 ? (n - 130) / 70 : 0}
            width={120}
            height={190}
          />
          <Text className="font-sans text-[10px] text-ink-muted text-center mt-1">
            Plant response to current N-P-K
          </Text>
        </View>

        {/* Nutrient Sliders */}
        <View className="flex-1 gap-2.5">
          {/* Nitrogen */}
          <View className="rounded-xl bg-cream p-2.5 border border-borderSubtle">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-sans-bold text-xs text-ink">
                Nitrogen (N) — Leaf Growth:
              </Text>
              <Text className="font-sans-extrabold text-xs text-primary">{n}%</Text>
            </View>
            <View className="flex-row gap-1">
              {[50, 75, 100, 130, 160].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setN(v)}
                  className={`flex-1 py-1 items-center rounded border ${
                    n === v ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                  }`}
                >
                  <Text
                    className={`font-sans text-[10px] ${
                      n === v ? "text-white font-bold" : "text-ink"
                    }`}
                  >
                    {v}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Phosphorus */}
          <View className="rounded-xl bg-cream p-2.5 border border-borderSubtle">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-sans-bold text-xs text-ink">
                Phosphorus (P) — Root Strength:
              </Text>
              <Text className="font-sans-extrabold text-xs text-forest">{p}%</Text>
            </View>
            <View className="flex-row gap-1">
              {[50, 75, 100, 130, 160].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setP(v)}
                  className={`flex-1 py-1 items-center rounded border ${
                    p === v ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                  }`}
                >
                  <Text
                    className={`font-sans text-[10px] ${
                      p === v ? "text-white font-bold" : "text-ink"
                    }`}
                  >
                    {v}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Potassium */}
          <View className="rounded-xl bg-cream p-2.5 border border-borderSubtle">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-sans-bold text-xs text-ink">
                Potassium (K) — Grain Filling:
              </Text>
              <Text className="font-sans-extrabold text-xs text-accent">{k}%</Text>
            </View>
            <View className="flex-row gap-1">
              {[50, 75, 100, 130, 160].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setK(v)}
                  className={`flex-1 py-1 items-center rounded border ${
                    k === v ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                  }`}
                >
                  <Text
                    className={`font-sans text-[10px] ${
                      k === v ? "text-white font-bold" : "text-ink"
                    }`}
                  >
                    {v}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Yield Outcome */}
      <View className="rounded-xl bg-sage/60 p-3 border border-sage-dark/40 mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-bold text-xs uppercase text-primary">
            Liebig's Law Outcome
          </Text>
          <Text className="font-sans-extrabold text-lg text-ink">
            {Math.round(relYield * 100)}% Max Yield
          </Text>
        </View>
        <Text className="mt-1 font-sans text-xs text-ink-muted">
          {notes.join(" ")}
        </Text>
      </View>

      {/* Nitrogen Split Application Toggle */}
      <View className="flex-row items-center justify-between rounded-xl bg-cream p-3 border border-borderSubtle">
        <View>
          <Text className="font-sans-bold text-xs text-ink">
            Nitrogen Application Timing
          </Text>
          <Text className="font-sans text-[11px] text-ink-muted">
            {splitUrea
              ? "3-Split Application: 55% Nitrogen absorbed"
              : "Single Heavy Broadcast: 67% lost to leaching"}
          </Text>
        </View>

        <Pressable
          onPress={() => setSplitUrea((v) => !v)}
          className={`rounded-full px-3 py-1.5 border ${
            splitUrea
              ? "bg-primary border-primary shadow-2xs"
              : "bg-white border-borderSubtle"
          }`}
        >
          <Text
            className={`font-sans-bold text-xs ${
              splitUrea ? "text-white" : "text-ink"
            }`}
          >
            {splitUrea ? "Split in 3" : "Single Dose"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default FeedingLab;
