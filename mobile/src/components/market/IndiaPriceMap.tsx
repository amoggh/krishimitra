import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { colors } from "@/theme/tokens";
import mandiData from "@/data/mandiSnapshot.json";

const TILES: [string, string, number, number][] = [
  ["JK", "Jammu & Kashmir", 2, 0],
  ["LA", "Ladakh", 3, 0],
  ["PB", "Punjab", 2, 1],
  ["HP", "Himachal Pradesh", 3, 1],
  ["CH", "Chandigarh", 2, 2],
  ["UK", "Uttarakhand", 3, 2],
  ["RJ", "Rajasthan", 1, 3],
  ["HR", "Haryana", 2, 3],
  ["DL", "Delhi", 3, 3],
  ["UP", "Uttar Pradesh", 4, 3],
  ["BR", "Bihar", 5, 3],
  ["SK", "Sikkim", 6, 3],
  ["AS", "Assam", 7, 3],
  ["AR", "Arunachal Pradesh", 8, 2],
  ["NL", "Nagaland", 8, 3],
  ["GJ", "Gujarat", 1, 4],
  ["MP", "Madhya Pradesh", 2, 4],
  ["CG", "Chhattisgarh", 3, 4],
  ["JH", "Jharkhand", 4, 4],
  ["WB", "West Bengal", 5, 4],
  ["ML", "Meghalaya", 7, 4],
  ["MN", "Manipur", 8, 4],
  ["MH", "Maharashtra", 2, 5],
  ["TS", "Telangana", 3, 5],
  ["OD", "Odisha", 4, 5],
  ["TR", "Tripura", 7, 5],
  ["MZ", "Mizoram", 8, 5],
  ["GA", "Goa", 1, 6],
  ["KA", "Karnataka", 2, 6],
  ["AP", "Andhra Pradesh", 3, 6],
  ["KL", "Kerala", 2, 7],
  ["TN", "Tamil Nadu", 3, 7],
  ["PY", "Puducherry", 4, 7],
];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const getTileColor = (t: number) =>
  `rgb(${lerp(220, 20, t)},${lerp(235, 92, t)},${lerp(210, 58, t)})`;

export function IndiaPriceMap({
  initialCommodity = "Onion",
}: {
  initialCommodity?: string;
}) {
  const items = (mandiData as any).items || {};
  const commodityList = useMemo(
    () => Object.keys(items).filter((k) => items[k].n >= 4),
    [items]
  );

  const [selectedCommodity, setSelectedCommodity] = useState(
    items[initialCommodity] ? initialCommodity : commodityList[0] || "Onion"
  );
  const [selectedState, setSelectedState] = useState("Karnataka");

  const activeItem = items[selectedCommodity] || { states: {}, markets: [], median: 0 };
  const stateMedians = Object.values(activeItem.states as Record<string, any>).map(
    (s) => s.median
  );
  const minPrice = stateMedians.length ? Math.min(...stateMedians) : 0;
  const maxPrice = stateMedians.length ? Math.max(...stateMedians) : 1;

  const stateInfo = activeItem.states[selectedState];
  const inStateMarkets = (activeItem.markets as any[])
    .filter((m) => m.state === selectedState)
    .slice(0, 6);

  const ladder = Object.entries(activeItem.states as Record<string, any>).sort(
    (a, b) => b[1].median - a[1].median
  );

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
            National Mandi Price Heatmap
          </Text>
          <Text className="font-sans text-[11px] text-ink-muted">
            State-by-state median modal wholesale rates
          </Text>
        </View>
        <Text className="font-sans-bold text-xs text-primary">
          All-India: ₹{Math.round(activeItem.median || 0).toLocaleString("en-IN")}/q
        </Text>
      </View>

      {/* Commodity Selector Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 gap-1.5">
        {commodityList.slice(0, 10).map((c) => (
          <Pressable
            key={c}
            onPress={() => setSelectedCommodity(c)}
            className={`rounded-full px-3 py-1 border transition-all ${
              selectedCommodity === c
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                selectedCommodity === c ? "text-white" : "text-ink"
              }`}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Main Grid: Tile Map on Left, State Details on Right */}
      <View className="flex-col md:flex-row gap-4">
        {/* Tile Map Container */}
        <View className="flex-1 items-center justify-center p-2 rounded-xl bg-cream border border-borderSubtle">
          <View
            style={{
              width: 265,
              height: 235,
              position: "relative",
            }}
          >
            {TILES.map(([ab, full, c, r]) => {
              const d = activeItem.states[full];
              const t = maxPrice > minPrice && d ? (d.median - minPrice) / (maxPrice - minPrice) : 0.5;
              const isSelected = selectedState === full;

              if (!d) {
                return (
                  <View
                    key={ab}
                    style={{
                      position: "absolute",
                      left: c * 29,
                      top: r * 29,
                    }}
                    className="h-7 w-7 items-center justify-center rounded-md bg-stone-200/50"
                  >
                    <Text className="font-sans text-[9px] text-ink-muted opacity-40">
                      {ab}
                    </Text>
                  </View>
                );
              }

              return (
                <Pressable
                  key={ab}
                  onPress={() => setSelectedState(full)}
                  style={{
                    position: "absolute",
                    left: c * 29,
                    top: r * 29,
                    backgroundColor: getTileColor(t),
                  }}
                  className={`h-7 w-7 items-center justify-center rounded-md transition-all ${
                    isSelected ? "ring-2 ring-[#183B2B] scale-110 shadow-sm" : ""
                  }`}
                >
                  <Text
                    className={`font-sans-bold text-[9px] ${
                      t > 0.5 ? "text-white" : "text-ink"
                    }`}
                  >
                    {ab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Color Ramp Bar */}
          <View className="mt-3 flex-row items-center justify-between w-full px-2">
            <Text className="font-sans text-[10px] text-ink-muted">
              ₹{minPrice.toLocaleString("en-IN")}
            </Text>
            <View className="h-1.5 flex-1 mx-2 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-800" />
            <Text className="font-sans text-[10px] text-ink-muted">
              ₹{maxPrice.toLocaleString("en-IN")}/q
            </Text>
          </View>
        </View>

        {/* Selected State Details & Leaderboard */}
        <View className="flex-1">
          {stateInfo ? (
            <View className="rounded-xl bg-sage/60 p-3.5 border border-sage-dark/40 mb-3">
              <Text className="font-sans-bold text-xs uppercase text-primary">
                {selectedState} Market Rate
              </Text>
              <Text className="font-sans-extrabold text-2xl text-ink">
                ₹{stateInfo.median.toLocaleString("en-IN")}{" "}
                <Text className="text-xs font-normal text-ink-muted">/quintal</Text>
              </Text>
              <Text className="font-sans text-xs text-ink-muted">
                {stateInfo.n} APMC records · Range ₹{stateInfo.lo} – ₹{stateInfo.hi}
              </Text>

              {inStateMarkets.length > 0 && (
                <View className="mt-2.5 gap-1 border-t border-primary/10 pt-2">
                  {inStateMarkets.map((m, idx) => (
                    <View key={idx} className="flex-row items-center justify-between">
                      <Text className="font-sans text-xs text-ink">
                        {m.market.replace(/ APMC| Market/gi, "")}, {m.district}
                      </Text>
                      <Text className="font-sans-bold text-xs text-forest">
                        ₹{m.modal}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="p-4 rounded-xl bg-cream border border-borderSubtle">
              <Text className="font-sans text-xs text-ink-muted">
                {selectedState} did not report trades for {selectedCommodity} today. Click a colored state tile.
              </Text>
            </View>
          )}

          {/* Top States Ladder */}
          <Text className="mb-1 font-sans-bold text-[10px] uppercase tracking-wider text-ink-muted">
            State Ranking (Highest Median First)
          </Text>
          <View className="gap-1">
            {ladder.slice(0, 5).map(([st, d]) => (
              <Pressable
                key={st}
                onPress={() => setSelectedState(st)}
                className={`flex-row items-center justify-between rounded-lg px-2.5 py-1.5 transition-all ${
                  selectedState === st
                    ? "bg-sage border border-primary/30"
                    : "bg-white hover:bg-cream"
                }`}
              >
                <Text
                  className={`font-sans text-xs ${
                    st === "Karnataka" ? "font-sans-bold text-primary" : "text-ink"
                  }`}
                >
                  {st}
                </Text>
                <Text className="font-sans-bold text-xs text-ink">
                  ₹{d.median.toLocaleString("en-IN")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default IndiaPriceMap;
