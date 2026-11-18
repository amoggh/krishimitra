import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Truck, Navigation, TrendingUp, AlertTriangle } from "lucide-react-native";
import { colors } from "@/theme/tokens";

export function TruckCalculator() {
  const [localPrice, setLocalPrice] = useState(2600);
  const [localDist, setLocalDist] = useState(15);
  const [farPrice, setFarPrice] = useState(3200);
  const [farDist, setFarDist] = useState(120);
  const [ratePerKm, setRatePerKm] = useState(1.5);
  const handlingFee = 30; // ₹30/q APMC fee

  const netLocal = localPrice - ratePerKm * localDist - handlingFee;
  const netFar = farPrice - ratePerKm * farDist - handlingFee;
  const gain = netFar - netLocal;
  const isFarWorthIt = gain > 0;
  const breakEvenDist =
    ratePerKm > 0 ? (farPrice - localPrice) / ratePerKm + localDist : localDist;

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-sage">
            <Truck size={18} color={colors.primary} />
          </View>
          <View>
            <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
              Mandi Transport & Break-even Calculator
            </Text>
            <Text className="font-sans text-[11px] text-ink-muted">
              Decide whether hiring a truck to a distant mandi earns more net profit
            </Text>
          </View>
        </View>
      </View>

      {/* Input parameters */}
      <View className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Local Mandi Card */}
        <View className="rounded-xl bg-cream p-3 border border-borderSubtle">
          <Text className="font-sans-bold text-xs text-primary mb-2">
            Local APMC Yard
          </Text>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-sans text-xs text-ink-muted">Modal Price (₹/q):</Text>
            <TextInput
              keyboardType="numeric"
              value={String(localPrice)}
              onChangeText={(t) => setLocalPrice(Number(t) || 0)}
              className="h-8 w-24 rounded-lg bg-white px-2.5 text-right font-sans-bold text-xs text-ink border border-borderSubtle"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-xs text-ink-muted">Distance (km):</Text>
            <TextInput
              keyboardType="numeric"
              value={String(localDist)}
              onChangeText={(t) => setLocalDist(Number(t) || 0)}
              className="h-8 w-24 rounded-lg bg-white px-2.5 text-right font-sans-bold text-xs text-ink border border-borderSubtle"
            />
          </View>
        </View>

        {/* Distant Mandi Card */}
        <View className="rounded-xl bg-sage/60 p-3 border border-sage-dark/40">
          <Text className="font-sans-bold text-xs text-forest mb-2">
            Distant APMC / Terminal Market
          </Text>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-sans text-xs text-ink-muted">Modal Price (₹/q):</Text>
            <TextInput
              keyboardType="numeric"
              value={String(farPrice)}
              onChangeText={(t) => setFarPrice(Number(t) || 0)}
              className="h-8 w-24 rounded-lg bg-white px-2.5 text-right font-sans-bold text-xs text-ink border border-borderSubtle"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-xs text-ink-muted">Distance (km):</Text>
            <TextInput
              keyboardType="numeric"
              value={String(farDist)}
              onChangeText={(t) => setFarDist(Number(t) || 0)}
              className="h-8 w-24 rounded-lg bg-white px-2.5 text-right font-sans-bold text-xs text-ink border border-borderSubtle"
            />
          </View>
        </View>
      </View>

      {/* Transport Rate Slider / Selector */}
      <View className="mb-4 flex-row items-center justify-between rounded-xl bg-white p-3 border border-borderSubtle">
        <Text className="font-sans text-xs text-ink">
          Truck Freight Rate: <Text className="font-sans-bold">₹{ratePerKm}/km/quintal</Text>
        </Text>
        <View className="flex-row gap-1.5">
          {[1.2, 1.5, 2.0, 2.5].map((r) => (
            <Pressable
              key={r}
              onPress={() => setRatePerKm(r)}
              className={`rounded-lg px-2.5 py-1 border transition-all ${
                ratePerKm === r
                  ? "bg-primary border-primary"
                  : "bg-cream border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-[11px] ${
                  ratePerKm === r ? "text-white" : "text-ink"
                }`}
              >
                ₹{r}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Outcome Verdict Card */}
      <View
        className={`rounded-xl p-4 border ${
          isFarWorthIt
            ? "bg-emerald-50 border-emerald-300"
            : "bg-amber-50 border-amber-300"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              className={`font-sans-bold text-xs uppercase ${
                isFarWorthIt ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {isFarWorthIt
                ? "✓ Recommended to Transport"
                : "⚠ Sell at Local Mandi Instead"}
            </Text>
            <Text className="font-sans-extrabold text-xl text-ink mt-0.5">
              Net Gain: ₹{Math.abs(Math.round(gain)).toLocaleString("en-IN")}/quintal
            </Text>
          </View>

          <View className="items-end">
            <Text className="font-sans text-xs text-ink-muted">
              Net Local: ₹{Math.round(netLocal)}/q
            </Text>
            <Text className="font-sans-bold text-xs text-forest">
              Net Distant: ₹{Math.round(netFar)}/q
            </Text>
          </View>
        </View>

        <Text className="mt-2 font-sans text-xs text-ink-muted">
          Break-even distance: up to{" "}
          <Text className="font-sans-bold text-ink">
            {Math.round(breakEvenDist)} km
          </Text>{" "}
          is viable before freight cost consumes the price premium.
        </Text>
      </View>
    </View>
  );
}

export default TruckCalculator;
