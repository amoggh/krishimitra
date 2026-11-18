import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { colors } from "@/theme/tokens";
import { DISTRICTS, DISTRICT_NAMES } from "@/data/districtsData";
import { CROPS } from "@/data/cropsData";
import { Calendar, Play, Pause, ChevronRight } from "lucide-react-native";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const START: Record<string, number> = { kharif: 5, rabi: 9, summer: 1 };

export function YearWheelLab() {
  const [district, setDistrict] = useState("Mysuru");
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth());

  const d = DISTRICTS[district] || DISTRICTS["Mysuru"];
  const maxRain = Math.max(...d.monthly, 1);
  const currentRain = d.monthly[monthIdx] || 0;

  const currentSeason =
    monthIdx >= 5 && monthIdx <= 9
      ? "Kharif (Monsoon)"
      : monthIdx >= 9 || monthIdx <= 1
      ? "Rabi (Winter)"
      : "Summer / Zaid";

  const sowList: string[] = [];
  const harvestList: string[] = [];

  CROPS.forEach((c) => {
    c.seasons.forEach((s) => {
      const st = START[s];
      if (monthIdx === st || monthIdx === (st + 1) % 12) {
        sowList.push(c.name.split(" (")[0]);
      }
      const hm = (st + Math.round(c.days / 30)) % 12;
      if (monthIdx === hm) {
        harvestList.push(c.name.split(" (")[0]);
      }
    });
  });

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 3: The Farming Year & Seasons
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          {district} District Calendar
        </Text>
      </View>

      {/* District Picker Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 gap-1.5">
        {["Mysuru", "Koppal", "Mandya", "Belagavi", "Shivamogga", "Haveri", "Udupi"].map((dst) => (
          <Pressable
            key={dst}
            onPress={() => setDistrict(dst)}
            className={`rounded-full px-3 py-1 border transition-all ${
              district === dst
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                district === dst ? "text-white" : "text-ink"
              }`}
            >
              {dst}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 12-Month Bar Visualizer */}
      <View className="mb-4 rounded-xl bg-cream p-3 border border-borderSubtle">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-sans-bold text-[10px] uppercase text-ink-muted">
            Monthly Normal Rainfall (IMD)
          </Text>
          <Text className="font-sans-bold text-xs text-primary">
            {MONTHS[monthIdx]}: {currentRain} mm
          </Text>
        </View>

        <View className="flex-row items-end justify-between h-28 px-1">
          {MONTHS.map((m, idx) => {
            const rain = d.monthly[idx] || 0;
            const barH = (rain / maxRain) * 75;
            const isSelected = monthIdx === idx;
            const isKharif = idx >= 5 && idx <= 9;
            const isRabi = idx >= 9 || idx <= 1;

            return (
              <Pressable
                key={m}
                onPress={() => setMonthIdx(idx)}
                className="items-center flex-1"
              >
                <View
                  style={{ height: Math.max(4, barH) }}
                  className={`w-4 rounded-t-md transition-all ${
                    isSelected
                      ? "bg-primary ring-2 ring-primary/40"
                      : isKharif
                      ? "bg-[#3A86A8]"
                      : isRabi
                      ? "bg-[#E9B44C]"
                      : "bg-[#C0392B]/70"
                  }`}
                />
                <Text
                  className={`mt-1 font-sans text-[10px] ${
                    isSelected ? "font-sans-extrabold text-primary" : "text-ink-muted"
                  }`}
                >
                  {m[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Month Status */}
      <View className="rounded-xl bg-sage/60 p-4 border border-sage-dark/40 mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="font-sans-extrabold text-lg text-ink">
              {MONTHS[monthIdx]} · {currentSeason}
            </Text>
            <Text className="font-sans text-xs text-ink-muted">
              Normal Rainfall: {currentRain} mm in {district}
            </Text>
          </View>

          <Pressable
            onPress={() => setMonthIdx((m) => (m + 1) % 12)}
            className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-2xs border border-primary/20"
          >
            <Text className="font-sans-bold text-xs text-primary">Next Month</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <View className="mt-2 border-t border-primary/10 pt-2 gap-1.5">
          <Text className="font-sans text-xs text-ink">
            <Text className="font-sans-bold text-primary">Can be Sown Now: </Text>
            {[...new Set(sowList)].join(", ") || "No major standard sowing window"}
          </Text>
          <Text className="font-sans text-xs text-ink">
            <Text className="font-sans-bold text-forest">Coming to Harvest: </Text>
            {[...new Set(harvestList)].join(", ") || "No major crops ready for harvest"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default YearWheelLab;
