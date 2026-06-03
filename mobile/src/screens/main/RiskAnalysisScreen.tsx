import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { RootStackScreenProps } from "@/types/navigation";
import { Card, GradientHeader, PrimaryButton, ScreenContainer } from "@/components/ui";
import { RiskMeter, RiskMeterLabel } from "@/components/risk/RiskMeter";
import { MonteCarloChart } from "@/components/charts/MonteCarloChart";
import { getRiskAnalysis } from "@/services/api";
import { mockRisk } from "@/data/mockData";
import type { RiskAnalysis } from "@/types/api";
import { colors } from "@/theme/colors";

type Props = RootStackScreenProps<"RiskAnalysis">;

export function RiskAnalysisScreen({ route }: Props) {
  const [risk, setRisk] = useState<RiskAnalysis>(mockRisk);

  useEffect(() => {
    getRiskAnalysis(route.params.planId)
      .then(setRisk)
      .catch(() => setRisk(mockRisk));
  }, [route.params.planId]);

  return (
    <View className="flex-1 bg-cream">
      <GradientHeader>
        <Text className="font-sans-extrabold text-xl text-white">Risk analysis</Text>
        <Text className="text-xs text-white/85">Soybean + Cotton · Kharif 2026</Text>
      </GradientHeader>
      <ScreenContainer safe={false} className="px-4">
        <Card className="items-center">
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">Overall risk score</Text>
          <Text className="font-sans-extrabold text-4xl text-warning">
            {risk.overall_score}
            <Text className="text-base text-ink-muted">/100</Text>
          </Text>
          <Text className="text-xs text-ink-muted">Moderate — manageable with insurance</Text>
          <View className="w-full">
            <RiskMeter score={risk.overall_score} color={colors.warning} />
          </View>
        </Card>

        <Card>
          <RiskMeterLabel label="Rainfall risk" value={`${risk.rainfall_risk_pct}% bad year`} />
          <Text className="mb-1 text-xs text-ink-muted">
            Yield below 60% expected in {risk.rainfall_risk_pct}% of simulated seasons
          </Text>
          <RiskMeter score={risk.rainfall_risk_pct} color={colors.warning} />
        </Card>

        <Card>
          <RiskMeterLabel label="Price volatility" value={`Cotton ${risk.price_volatility_pct}%`} />
          <Text className="mb-1 text-xs text-ink-muted">
            Price crash &gt;40% at harvest: Cotton 12% · Soybean 6%
          </Text>
          <RiskMeter score={risk.price_volatility_pct} color={colors.danger} />
        </Card>

        <Card>
          <RiskMeterLabel label="Pest risk" value={risk.pest_risk} />
          <Text className="text-xs text-ink-muted">
            Historical incidence low for soybean in Pune region
          </Text>
        </Card>

        <Card>
          <Text className="font-sans-bold text-[11px] uppercase text-ink-light">
            Monte Carlo · 10,000 scenarios
          </Text>
          <MonteCarloChart data={risk.profit_distribution} />
          <Text className="text-xs text-ink-muted">
            Green = profit distribution · Gold dashed = conservative (P25)
          </Text>
        </Card>

        <PrimaryButton label="View PMFBY insurance suggestion" variant="outline" />
      </ScreenContainer>
    </View>
  );
}
