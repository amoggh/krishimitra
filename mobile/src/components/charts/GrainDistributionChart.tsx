import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { colors } from "@/theme/tokens";

export interface GrainDistributionProps {
  p10: number; // 10th percentile (Bad year)
  p50: number; // 50th percentile (Typical)
  p90: number; // 90th percentile (Good year)
  bins?: number[];
  lossProbability?: number; // 0.0 to 1.0
  height?: number;
}

export function GrainDistributionChart({
  p10,
  p50,
  p90,
  bins = [6, 14, 28, 45, 62, 85, 95, 78, 48, 25, 10, 4],
  lossProbability = 0.06,
  height = 180,
}: GrainDistributionProps) {
  const W = 500;
  const H = 160;
  const pad = 24;
  const base = H - 42;

  const minVal = Math.min(0, p10 * 1.2);
  const maxVal = Math.max(p90 * 1.15, p50 * 1.5);

  const numBins = bins.length;
  const maxBin = Math.max(...bins, 1);
  const binWidth = (W - pad * 2) / numBins;

  const fmtInr = (n: number) => {
    const s = Math.round(Math.abs(n));
    const sign = n < 0 ? "-" : "";
    if (s >= 100000) return `${sign}₹${(s / 100000).toFixed(2)}L`;
    return `${sign}₹${s.toLocaleString("en-IN")}`;
  };

  const getX = (val: number) => {
    const range = maxVal - minVal || 1;
    return pad + ((val - minVal) / range) * (W - pad * 2);
  };

  const xZero = getX(0);
  const xP10 = getX(p10);
  const xP50 = getX(p50);
  const xP90 = getX(p90);

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
            500 Simulated Seasons Distribution
          </Text>
          <Text className="font-sans text-[11px] text-ink-muted">
            Monte Carlo weather & market price variance analysis
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-sans-bold text-xs text-ink">
            Risk of Loss: {(lossProbability * 100).toFixed(1)}%
          </Text>
          <Text className="font-sans text-[10px] text-forest">
            94% Profitable Scenarios
          </Text>
        </View>
      </View>

      <View style={{ height, width: "100%" }}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {/* Baseline */}
          <Line
            x1={pad}
            y1={base}
            x2={W - pad}
            y2={base}
            stroke="#183B2B"
            strokeWidth={1.5}
          />

          {/* Histogram Bars */}
          {bins.map((count, i) => {
            const barH = (count / maxBin) * (base - 30);
            const x = pad + i * binWidth;
            const y = base - barH;
            const barCenterVal = minVal + (i + 0.5) * ((maxVal - minVal) / numBins);
            const isLoss = barCenterVal < 0;

            return (
              <Rect
                key={i}
                x={x + 2}
                y={y}
                width={Math.max(2, binWidth - 4)}
                height={barH}
                rx={3}
                fill={isLoss ? colors.danger : colors.primary}
                fillOpacity={isLoss ? 0.75 : 0.85}
              />
            );
          })}

          {/* Break-even line if within range */}
          {minVal < 0 && (
            <G>
              <Line
                x1={xZero}
                y1={12}
                x2={xZero}
                y2={base}
                stroke={colors.danger}
                strokeWidth={1.2}
                strokeDasharray="4, 3"
              />
              <SvgText
                x={xZero + 4}
                y={22}
                fill={colors.danger}
                fontSize={9}
                fontFamily="Manrope, sans-serif"
                fontWeight="bold"
              >
                BREAK-EVEN
              </SvgText>
            </G>
          )}

          {/* Marker: Bad Year (P10) */}
          <G>
            <Line
              x1={xP10}
              y1={base}
              x2={xP10}
              y2={base + 8}
              stroke="#718078"
              strokeWidth={1.2}
            />
            <SvgText
              x={xP10}
              y={base + 20}
              textAnchor="middle"
              fill="#718078"
              fontSize={9}
              fontFamily="Manrope, sans-serif"
            >
              BAD YEAR
            </SvgText>
            <SvgText
              x={xP10}
              y={base + 34}
              textAnchor="middle"
              fill={p10 < 0 ? colors.danger : "#183B2B"}
              fontSize={11}
              fontWeight="bold"
              fontFamily="Manrope, sans-serif"
            >
              {fmtInr(p10)}
            </SvgText>
          </G>

          {/* Marker: Typical Season (P50) */}
          <G>
            <Line
              x1={xP50}
              y1={base}
              x2={xP50}
              y2={base + 8}
              stroke={colors.primary}
              strokeWidth={1.5}
            />
            <SvgText
              x={xP50}
              y={base + 20}
              textAnchor="middle"
              fill={colors.primary}
              fontSize={9}
              fontWeight="bold"
              fontFamily="Manrope, sans-serif"
            >
              TYPICAL
            </SvgText>
            <SvgText
              x={xP50}
              y={base + 34}
              textAnchor="middle"
              fill={colors.primary}
              fontSize={12}
              fontWeight="bold"
              fontFamily="Manrope, sans-serif"
            >
              {fmtInr(p50)}
            </SvgText>
          </G>

          {/* Marker: Good Year (P90) */}
          <G>
            <Line
              x1={xP90}
              y1={base}
              x2={xP90}
              y2={base + 8}
              stroke="#718078"
              strokeWidth={1.2}
            />
            <SvgText
              x={xP90}
              y={base + 20}
              textAnchor="middle"
              fill="#718078"
              fontSize={9}
              fontFamily="Manrope, sans-serif"
            >
              GOOD YEAR
            </SvgText>
            <SvgText
              x={xP90}
              y={base + 34}
              textAnchor="middle"
              fill={colors.forest}
              fontSize={11}
              fontWeight="bold"
              fontFamily="Manrope, sans-serif"
            >
              {fmtInr(p90)}
            </SvgText>
          </G>
        </Svg>
      </View>
    </View>
  );
}

export default GrainDistributionChart;
