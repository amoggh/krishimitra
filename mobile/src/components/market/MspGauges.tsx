import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
import { ShieldCheck, AlertCircle } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { MSP_AT_SNAPSHOT } from "@/data/marketData";

export interface MspGaugeItem {
  cropId: string;
  name: string;
  marketPrice: number;
  msp: number;
}

const DEFAULT_CROPS: MspGaugeItem[] = [
  { cropId: "ragi", name: "Ragi", marketPrice: 4400, msp: 5205 },
  { cropId: "paddy", name: "Paddy", marketPrice: 2450, msp: 2369 },
  { cropId: "maize", name: "Maize", marketPrice: 2600, msp: 2400 },
  { cropId: "tur", name: "Tur (Pigeon Pea)", marketPrice: 8400, msp: 8000 },
  { cropId: "groundnut", name: "Groundnut", marketPrice: 7900, msp: 7263 },
  { cropId: "cotton", name: "Cotton", marketPrice: 7400, msp: 7710 },
  { cropId: "chickpea", name: "Bengal Gram", marketPrice: 6300, msp: 5875 },
];

export function MspGauges({
  items = DEFAULT_CROPS,
}: {
  items?: MspGaugeItem[];
}) {
  const [selectedCrop, setSelectedCrop] = useState<string>("ragi");
  const active = items.find((i) => i.cropId === selectedCrop) || items[0];

  const diff = active.marketPrice - active.msp;
  const isAboveMsp = diff >= 0;
  const ratio = active.marketPrice / (active.msp || 1); // e.g. 0.85 to 1.25

  // Map ratio (0.7 to 1.3) to gauge angle (-60deg to +60deg)
  const clampedRatio = Math.max(0.7, Math.min(1.3, ratio));
  const angleDeg = ((clampedRatio - 1.0) / 0.3) * 60; // 0 deg is right at MSP

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
            MSP Procurement vs Open Market Gauge
          </Text>
          <Text className="font-sans text-[11px] text-ink-muted">
            Check whether to register for MSP procurement or sell in APMC mandis
          </Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-sage px-2.5 py-1">
          <ShieldCheck size={13} color={colors.primary} />
          <Text className="font-sans-bold text-[10px] text-primary">
            Govt MSP Reference
          </Text>
        </View>
      </View>

      {/* Crop Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 gap-1.5">
        {items.map((it) => (
          <Pressable
            key={it.cropId}
            onPress={() => setSelectedCrop(it.cropId)}
            className={`rounded-full px-3 py-1 border transition-all ${
              selectedCrop === it.cropId
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                selectedCrop === it.cropId ? "text-white" : "text-ink"
              }`}
            >
              {it.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Gauge & Price Comparison Container */}
      <View className="flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-cream border border-borderSubtle">
        {/* Needle Gauge Display */}
        <View className="items-center justify-center">
          <Svg viewBox="0 0 200 120" width={180} height={110}>
            {/* Background Arc */}
            <Path
              d="M 30 100 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="#D7D2C4"
              strokeWidth={14}
              strokeLinecap="round"
            />
            {/* Below MSP Red Zone */}
            <Path
              d="M 30 100 A 70 70 0 0 1 100 30"
              fill="none"
              stroke="#E8A598"
              strokeWidth={14}
              strokeLinecap="round"
            />
            {/* Above MSP Green Zone */}
            <Path
              d="M 100 30 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="#A3CFB2"
              strokeWidth={14}
              strokeLinecap="round"
            />

            {/* MSP Center Notch */}
            <Line x1={100} y1={20} x2={100} y2={35} stroke="#183B2B" strokeWidth={2} />
            <SvgText
              x={100}
              y={16}
              textAnchor="middle"
              fill="#183B2B"
              fontSize={10}
              fontWeight="bold"
              fontFamily="Manrope, sans-serif"
            >
              MSP ₹{active.msp}
            </SvgText>

            {/* Needle */}
            <Line
              x1={100}
              y1={100}
              x2={100 + Math.sin((angleDeg * Math.PI) / 180) * 58}
              y2={100 - Math.cos((angleDeg * Math.PI) / 180) * 58}
              stroke="#183B2B"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Circle cx={100} cy={100} r={6} fill="#183B2B" />
          </Svg>
          <Text className="font-sans text-[10px] text-ink-muted -mt-1">
            ◀ Below MSP | Above MSP ▶
          </Text>
        </View>

        {/* Pricing Comparison Stats */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-sans text-xs text-ink-muted">Market Wholesale:</Text>
            <Text className="font-sans-extrabold text-lg text-ink">
              ₹{active.marketPrice.toLocaleString("en-IN")}/q
            </Text>
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-sans text-xs text-ink-muted">Guaranteed MSP:</Text>
            <Text className="font-sans-bold text-sm text-ink-muted">
              ₹{active.msp.toLocaleString("en-IN")}/q
            </Text>
          </View>

          {/* Actionable Recommendation */}
          <View
            className={`rounded-xl p-3 border ${
              isAboveMsp
                ? "bg-emerald-50 border-emerald-300"
                : "bg-rose-50 border-rose-300"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                isAboveMsp ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {isAboveMsp
                ? `Trade in APMC: ₹${Math.abs(diff)}/q premium over MSP`
                : `Sell via MSP: Mandi trades ₹${Math.abs(diff)}/q below MSP`}
            </Text>
            <Text className="mt-1 font-sans text-[11px] text-ink-muted">
              {isAboveMsp
                ? "Open market demand is strong. Sell in competitive APMC auctions."
                : "Register at your nearest PACS / procurement purchase center to claim full MSP."}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default MspGauges;
