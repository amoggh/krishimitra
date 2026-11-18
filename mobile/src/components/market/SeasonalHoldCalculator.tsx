import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Calendar, TrendingUp, Clock, Scale } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { SEASON_SHAPE } from "@/data/marketData";
import { CROPS } from "@/data/cropsData";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SeasonalHoldCalculator() {
  const [selectedCropId, setSelectedCropId] = useState("onion");
  const [basePrice, setBasePrice] = useState(3200);
  const [holdMonths, setHoldMonths] = useState(2);
  const [storageCostPerMonth, setStorageCostPerMonth] = useState(35); // ₹35/q/month

  const crop = CROPS.find((c) => c.id === selectedCropId) || CROPS[0];
  const seasonalMultipliers = SEASON_SHAPE[selectedCropId] || Array(12).fill(1.0);

  // Spoilage / shrinkage loss per month
  const shrinkageLossRate =
    selectedCropId === "tomato"
      ? 0.35 // perishable
      : selectedCropId === "onion"
      ? 0.04
      : 0.008; // grains / pulses ~ 0.8%

  // Current month index (0 to 11)
  const currentMonthIdx = new Date().getMonth();
  const targetMonthIdx = (currentMonthIdx + holdMonths) % 12;

  // Expected price in target month adjusted for seasonal cycle
  const currentMultiplier = seasonalMultipliers[currentMonthIdx] || 1;
  const targetMultiplier = seasonalMultipliers[targetMonthIdx] || 1;
  const projectedGrossPrice = (basePrice / currentMultiplier) * targetMultiplier;

  // Net realized price after storage fees and shrinkage
  const retainedWeightRatio = Math.pow(1 - shrinkageLossRate, holdMonths);
  const totalStorageFee = storageCostPerMonth * holdMonths;
  const netProjectedPrice =
    holdMonths === 0
      ? basePrice
      : projectedGrossPrice * retainedWeightRatio - totalStorageFee;

  const netDiff = netProjectedPrice - basePrice;
  const isHoldingProfitable = netDiff > 0 && selectedCropId !== "tomato";

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
            Harvest Seasonality & Storage Hold Simulator
          </Text>
          <Text className="font-sans text-[11px] text-ink-muted">
            Weigh storage costs and shrinkage against off-season seasonal price spikes
          </Text>
        </View>
        <Text className="font-sans-bold text-xs text-primary">
          {MONTHS[currentMonthIdx]} Baseline
        </Text>
      </View>

      {/* Crop Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 gap-1.5">
        {["onion", "tomato", "maize", "ragi", "tur", "cotton", "groundnut"].map((id) => {
          const c = CROPS.find((x) => x.id === id);
          return (
            <Pressable
              key={id}
              onPress={() => {
                setSelectedCropId(id);
                setBasePrice(c?.price || 3000);
              }}
              className={`rounded-full px-3 py-1 border transition-all ${
                selectedCropId === id
                  ? "bg-primary border-primary shadow-xs"
                  : "bg-cream border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  selectedCropId === id ? "text-white" : "text-ink"
                }`}
              >
                {c?.name.split(" (")[0] || id}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Seasonality Heatmap Bar */}
      <View className="mb-4 rounded-xl bg-cream p-3 border border-borderSubtle">
        <Text className="mb-2 font-sans-bold text-[10px] uppercase text-ink-muted">
          12-Month Price Seasonality Index (High vs Harvest Glut)
        </Text>
        <View className="flex-row items-center justify-between">
          {MONTHS.map((m, idx) => {
            const mult = seasonalMultipliers[idx] || 1;
            const isHigh = mult >= 1.08;
            const isLow = mult <= 0.92;
            const isTarget = idx === targetMonthIdx;
            const isCurrent = idx === currentMonthIdx;

            return (
              <View key={m} className="items-center">
                <Text
                  className={`font-sans text-[10px] ${
                    isCurrent
                      ? "font-sans-extrabold text-primary underline"
                      : isTarget
                      ? "font-sans-bold text-forest"
                      : "text-ink-muted"
                  }`}
                >
                  {m[0]}
                </Text>
                <View
                  className={`mt-1 h-6 w-5 items-center justify-center rounded-sm ${
                    isHigh
                      ? "bg-emerald-600"
                      : isLow
                      ? "bg-amber-400"
                      : "bg-emerald-200"
                  } ${isTarget ? "ring-2 ring-primary" : ""}`}
                >
                  <Text className="font-sans text-[8px] text-white font-bold">
                    {mult.toFixed(2).replace("0.", ".")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Interactive Hold Duration Slider Controls */}
      <View className="mb-4 flex-row items-center justify-between rounded-xl bg-sage/60 p-3 border border-sage-dark/40">
        <View>
          <Text className="font-sans-bold text-xs text-primary">
            Hold Period: {holdMonths === 0 ? "Sell Now (0 mo)" : `${holdMonths} Months`}
          </Text>
          <Text className="font-sans text-[10px] text-ink-muted">
            Target Sale Month: {MONTHS[targetMonthIdx]}
          </Text>
        </View>

        <View className="flex-row gap-1">
          {[0, 1, 2, 3, 4].map((m) => (
            <Pressable
              key={m}
              onPress={() => setHoldMonths(m)}
              className={`rounded-lg px-2.5 py-1 border transition-all ${
                holdMonths === m
                  ? "bg-primary border-primary"
                  : "bg-white border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  holdMonths === m ? "text-white" : "text-ink"
                }`}
              >
                {m}m
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Decision Summary Banner */}
      <View
        className={`rounded-xl p-3.5 border ${
          selectedCropId === "tomato"
            ? "bg-amber-50 border-amber-300"
            : isHoldingProfitable
            ? "bg-emerald-50 border-emerald-300"
            : "bg-stone-50 border-stone-200"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              className={`font-sans-bold text-xs uppercase ${
                selectedCropId === "tomato"
                  ? "text-amber-800"
                  : isHoldingProfitable
                  ? "text-emerald-800"
                  : "text-ink"
              }`}
            >
              {selectedCropId === "tomato"
                ? "Perishable Crop: Do Not Store"
                : isHoldingProfitable
                ? `Hold Favored: +₹${Math.round(netDiff)}/q Net Extra`
                : "Sell Immediately at Harvest"}
            </Text>
            <Text className="font-sans-extrabold text-xl text-ink mt-0.5">
              Net Value: ₹{Math.round(netProjectedPrice).toLocaleString("en-IN")}/q
            </Text>
          </View>

          <View className="items-end">
            <Text className="font-sans text-xs text-ink-muted">
              Current Rate: ₹{basePrice}/q
            </Text>
            <Text className="font-sans text-[10px] text-ink-muted">
              Shrinkage: {(shrinkageLossRate * holdMonths * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <Text className="mt-2 font-sans text-xs text-ink-muted">
          {selectedCropId === "tomato"
            ? "Tomatoes cannot be stored without specialized cold chains. Grade and sell immediately."
            : isHoldingProfitable
            ? `Post-harvest off-season price spike in ${MONTHS[targetMonthIdx]} exceeds storage rent (₹${totalStorageFee}/q) and drying loss.`
            : `Holding beyond harvest glut incurs storage fees that erode price gains. Immediate sale is safer.`}
        </Text>
      </View>
    </View>
  );
}

export default SeasonalHoldCalculator;
