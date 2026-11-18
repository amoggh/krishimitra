import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { LIVE_ROWS, type LiveTickerRow } from "@/data/marketData";

export function SplitFlapTicker({
  rows = LIVE_ROWS,
  onSelectRow,
}: {
  rows?: LiveTickerRow[];
  onSelectRow?: (row: LiveTickerRow) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (rows.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rows.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [rows.length]);

  const active = rows[currentIndex] || rows[0];

  return (
    <Pressable
      onPress={() => onSelectRow?.(active)}
      className="my-3 overflow-hidden rounded-2xl border border-[#183B2B]/20 bg-[#17261B] p-4 shadow-md"
    >
      <View className="mb-2 flex-row items-center justify-between border-b border-white/10 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <Text className="font-sans-bold text-[10px] uppercase tracking-widest text-[#E9B44C]">
            AGMARKNET Live Ticker
          </Text>
        </View>
        <Text className="font-sans text-[10px] text-white/50">
          {currentIndex + 1} / {rows.length}
        </Text>
      </View>

      {/* Split-Flap Display Area */}
      <View className="flex-row items-baseline justify-between pt-1">
        <View className="flex-1 pr-2">
          <Text
            className="font-sans-extrabold text-xl text-white tracking-wide uppercase"
            numberOfLines={1}
          >
            {active.name}
          </Text>
          <Text className="font-sans text-xs text-white/60">
            {active.market} · {active.district}
          </Text>
        </View>

        <View className="items-end">
          <View className="flex-row items-baseline gap-1">
            <Text className="font-sans-extrabold text-2xl text-[#E9B44C]">
              ₹{active.modal.toLocaleString("en-IN")}
            </Text>
            <Text className="font-sans text-xs text-white/60">/q</Text>
          </View>
          <Text className="font-sans text-[10px] text-white/40">
            Min: ₹{active.min} · Max: ₹{active.max}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default SplitFlapTicker;
