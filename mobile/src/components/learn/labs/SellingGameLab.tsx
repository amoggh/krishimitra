import React, { useState, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { SEASON_SHAPE } from "@/data/marketData";
import { CROP_BY_ID } from "@/data/cropsData";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GAME: Record<string, [number, number, number]> = {
  onion: [3, 40, 0.04], // harvest month April (3), ₹40/q/mo storage, 4% shrinkage
  maize: [10, 15, 0.005], // harvest Nov (10), ₹15 storage, 0.5% shrinkage
  tur: [11, 18, 0.005], // harvest Dec (11), ₹18 storage, 0.5% shrinkage
  groundnut: [10, 20, 0.007],
};

export function SellingGameLab() {
  const [cropId, setCropId] = useState("onion");
  const [elapsedMonths, setElapsedMonths] = useState(0);
  const [soldMonth, setSoldMonth] = useState<number | null>(null);
  const [seed, setSeed] = useState(1);

  const crop = CROP_BY_ID[cropId] || CROP_BY_ID["onion"];
  const [harvestMonth, storageCost, shrinkageRate] = GAME[cropId] || [3, 40, 0.04];
  const totalHorizon = 8;

  // Monthly projected market prices with simulated volatility noise
  const prices = useMemo(() => {
    const shape = SEASON_SHAPE[cropId] || Array(12).fill(1.0);
    const avgMult = shape.reduce((a, b) => a + b, 0) / 12;
    return Array.from({ length: totalHorizon }, (_, i) => {
      const monthIdx = (harvestMonth + i) % 12;
      const noise = 1 + Math.sin(seed * 11.3 + i * 4.7) * (crop.pVol * 0.35);
      const gross = Math.round(((crop.price * shape[monthIdx]) / avgMult) * noise);
      const net = Math.round(
        gross * Math.pow(1 - shrinkageRate, i) - storageCost * i
      );
      return {
        month: MONTHS[monthIdx],
        gross,
        net,
      };
    });
  }, [cropId, seed, harvestMonth, storageCost, shrinkageRate, crop.pVol, crop.price]);

  const bestOutcome = Math.max(...prices.map((p) => p.net));
  const bestMonthIdx = prices.findIndex((p) => p.net === bestOutcome);

  const currentPrice = prices[elapsedMonths] || prices[0];
  const isFinal = soldMonth !== null;

  const resetGame = () => {
    setElapsedMonths(0);
    setSoldMonth(null);
    setSeed((s) => s + 1);
  };

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 8: Sell Now or Store & Hold?
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Market Simulation Game
        </Text>
      </View>

      {/* Crop Selector */}
      <View className="mb-4 flex-row gap-1.5">
        {Object.keys(GAME).map((id) => (
          <Pressable
            key={id}
            onPress={() => {
              setCropId(id);
              setElapsedMonths(0);
              setSoldMonth(null);
            }}
            className={`flex-1 rounded-xl py-1.5 items-center border transition-all ${
              cropId === id
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                cropId === id ? "text-white" : "text-ink"
              }`}
            >
              {CROP_BY_ID[id]?.name.split(" (")[0] || id}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Monthly Timeline Cards */}
      <View className="mb-4 rounded-xl bg-cream p-3 border border-borderSubtle">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-sans text-xs text-ink-muted">
            Current Stage: Month {elapsedMonths} ({currentPrice.month})
          </Text>
          <Text className="font-sans-bold text-xs text-primary">
            Storage Fee: ₹{storageCost * elapsedMonths}/q
          </Text>
        </View>

        <View className="flex-row gap-1">
          {prices.map((p, idx) => {
            const isPassed = idx <= elapsedMonths;
            const isCurrent = idx === elapsedMonths;
            const isSold = soldMonth === idx;

            return (
              <View
                key={p.month}
                className={`flex-1 items-center p-1.5 rounded-lg border ${
                  isSold
                    ? "bg-primary border-primary"
                    : isCurrent
                    ? "bg-sage border-primary/60 ring-1 ring-primary"
                    : isPassed
                    ? "bg-white border-borderSubtle"
                    : "bg-stone-200/40 border-transparent opacity-40"
                }`}
              >
                <Text
                  className={`font-sans text-[10px] ${
                    isSold ? "text-white font-bold" : "text-ink"
                  }`}
                >
                  {p.month}
                </Text>
                <Text
                  className={`font-sans-bold text-[10px] ${
                    isSold ? "text-white" : isPassed ? "text-forest" : "text-ink-muted"
                  }`}
                >
                  ₹{isPassed ? p.net : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Live Financial Realization */}
      <View className="grid grid-cols-3 gap-2 rounded-xl bg-sage/60 p-3 border border-sage-dark/40 mb-3">
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Mandi Quote</Text>
          <Text className="font-sans-extrabold text-sm text-ink">
            ₹{currentPrice.gross.toLocaleString("en-IN")}/q
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Net After Costs</Text>
          <Text className="font-sans-extrabold text-sm text-forest">
            ₹{currentPrice.net.toLocaleString("en-IN")}/q
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Harvest Baseline</Text>
          <Text className="font-sans-extrabold text-sm text-ink-muted">
            ₹{prices[0].net.toLocaleString("en-IN")}/q
          </Text>
        </View>
      </View>

      {/* Decision Buttons */}
      {!isFinal ? (
        <View className="flex-row gap-2 mb-3">
          <Pressable
            onPress={() => setSoldMonth(elapsedMonths)}
            className="flex-1 rounded-full bg-primary py-2.5 items-center active:bg-primary-dark shadow-2xs"
          >
            <Text className="font-sans-bold text-xs text-white">
              Sell Now at {currentPrice.month} (₹{currentPrice.net}/q)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setElapsedMonths((m) => Math.min(totalHorizon - 1, m + 1))}
            disabled={elapsedMonths >= totalHorizon - 1}
            className="rounded-full bg-white border border-primary px-4 py-2.5 items-center active:bg-cream"
          >
            <Text className="font-sans-bold text-xs text-primary">
              Hold +1 Month
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mb-3">
          <View className="rounded-xl bg-emerald-50 p-3 border border-emerald-300 mb-2">
            <Text className="font-sans-bold text-xs text-emerald-800 uppercase">
              Harvest Sale Result
            </Text>
            <Text className="font-sans-extrabold text-lg text-ink mt-0.5">
              You Realized: ₹{prices[soldMonth].net.toLocaleString("en-IN")}/quintal
            </Text>
            <Text className="font-sans text-xs text-ink-muted mt-1">
              Harvest day rate was ₹{prices[0].net}/q. Best peak month was{" "}
              {prices[bestMonthIdx].month} at ₹{bestOutcome}/q.
            </Text>
          </View>

          <Pressable
            onPress={resetGame}
            className="rounded-full bg-cream border border-borderSubtle py-2 items-center active:bg-sand"
          >
            <Text className="font-sans-bold text-xs text-ink">
              Play Next Season's Market
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default SellingGameLab;
