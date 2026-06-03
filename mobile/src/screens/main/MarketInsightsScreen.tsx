import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, FormInput, ScreenContainer } from "@/components/ui";
import { PriceTrendChart } from "@/components/charts/PriceTrendChart";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { getMandiPrices } from "@/services/api";
import { mockMandiPrices } from "@/data/mockData";
import type { MandiPrice } from "@/types/api";
import { colors } from "@/theme/colors";

type Props = MainTabScreenProps<"Market">;

export function MarketInsightsScreen(_props: Props) {
  const [prices, setPrices] = useState<MandiPrice[]>(mockMandiPrices);

  useEffect(() => {
    getMandiPrices("Pune")
      .then(setPrices)
      .catch(() => setPrices(mockMandiPrices));
  }, []);

  return (
    <ScreenContainer>
      <Text className="font-sans-extrabold text-2xl text-ink">Mandi insights</Text>
      <Text className="mb-4 text-sm text-ink-muted">Pune · Live from Agmarknet</Text>
      <FormInput label="Search crop" defaultValue="Soybean" />

      {prices.map((item) => (
        <Card key={item.crop}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="font-sans-extrabold text-base text-ink">{item.crop}</Text>
              <Text className="text-xs text-ink-muted">
                {item.mandi} · Updated {item.updated_at}
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-sans-extrabold text-xl text-forest">
                ₹{item.price_inr.toLocaleString("en-IN")}
              </Text>
              <Text
                className={`font-sans-bold text-xs ${item.change_pct >= 0 ? "text-success" : "text-danger"}`}
              >
                {item.change_pct >= 0 ? "+" : ""}
                {item.change_pct}%
              </Text>
            </View>
          </View>
          <PriceTrendChart data={item.trend_7d} height={100} />
          <Text className="text-xs text-ink-muted">7-day trend · MSP floor ₹4,400/q</Text>
        </Card>
      ))}

      <Card>
        <Text className="font-sans-bold text-[11px] uppercase text-ink-light">Seasonal demand index</Text>
        <MiniBarChart data={[30, 45, 65, 90, 70]} barColor={colors.earthSoft} />
        <Text className="text-xs text-ink-muted">Kharif peak demand · Jun–Oct</Text>
      </Card>

      <View className="flex-row gap-2.5">
        <Card className="flex-1">
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">Top gainer</Text>
          <Text className="font-sans-bold text-sm text-forest">Onion +8%</Text>
        </Card>
        <Card className="flex-1">
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">Watch</Text>
          <Text className="font-sans-bold text-sm text-warning">Tomato volatile</Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}
