import React from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Line,
  G,
  Path,
  Circle,
  Ellipse,
} from "react-native-svg";

const GRASS = new Set(["ragi", "maize", "paddy", "jowar", "sugarcane"]);
export const plantKind = (id: string): "grass" | "broad" =>
  GRASS.has(id.toLowerCase()) ? "grass" : "broad";

const hexToRgb = (hex: string): [number, number, number] => {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const mix = (hexA: string, hexB: string, t: number): string => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
};

export interface ProceduralPlantProps {
  growth?: number; // 0.0 to 1.0
  kind?: "grass" | "broad";
  hue?: string;
  heightScale?: number;
  roots?: number;
  fruit?: number;
  tilt?: number;
  yellow?: number;
  purple?: number;
  scorch?: number;
  pests?: number;
  width?: number;
  height?: number;
  label?: string;
}

export function ProceduralPlant({
  growth = 1,
  kind = "grass",
  hue = "#B5532F",
  heightScale = 1,
  roots = 1,
  fruit = 1,
  tilt = 0,
  yellow = 0,
  purple = 0,
  scorch = 0,
  pests = 0,
  width = 160,
  height = 240,
}: ProceduralPlantProps) {
  const g = Math.min(1, Math.max(0.05, growth));
  const base = 232;
  const H = Math.max(8, g * heightScale * 186);
  const senes = Math.max(0, (g - 0.86) / 0.14) * 0.75;
  const leafColor =
    purple > 0.05
      ? mix("#145C3A", "#6C3A6E", Math.min(1, purple))
      : mix("#145C3A", "#C9A227", Math.min(1, yellow + senes));

  const n = Math.max(1, Math.floor(2 + g * 9));
  const leaves: React.ReactNode[] = [];

  for (let i = 0; i < n; i++) {
    const f = (i + 1) / (n + 1);
    const y = base - H * f;
    const side = i % 2 ? 1 : -1;
    const grow = Math.min(1, g * 2.4 - f * 0.55);
    if (grow <= 0) continue;

    if (kind === "grass") {
      const L = (46 + 62 * (1 - f * 0.55)) * grow * Math.min(1.25, heightScale);
      const dx = side * L;
      const dy = L * 0.28;
      leaves.push(
        <Path
          key={`l-${i}`}
          d={`M100 ${y} Q${100 + dx * 0.5} ${y - L * 0.55} ${100 + dx} ${y + dy} Q${
            100 + dx * 0.42
          } ${y - L * 0.28} 100 ${y + 9} Z`}
          fill={leafColor}
          fillOpacity={0.92}
        />
      );
      if (scorch > 0.05) {
        leaves.push(
          <Circle
            key={`s-${i}`}
            cx={100 + dx}
            cy={y + dy}
            r={2 + scorch * 5}
            fill="#7A4A25"
          />
        );
      }
    } else {
      const L = (19 + 24 * (1 - f * 0.4)) * grow * Math.min(1.25, heightScale);
      const cx = 100 + side * L * 1.05;
      const cy = y - 4;
      leaves.push(
        <G key={`l-${i}`}>
          <Line
            x1={100}
            y1={y}
            x2={cx}
            y2={cy}
            stroke={leafColor}
            strokeWidth={1.2}
          />
          <Ellipse
            cx={cx}
            cy={cy}
            rx={L}
            ry={L * 0.56}
            fill={leafColor}
            fillOpacity={0.92}
            transform={`rotate(${side * -18}, ${cx}, ${cy})`}
          />
          {scorch > 0.05 && (
            <Circle
              cx={cx + side * L * 0.82}
              cy={cy}
              r={2 + scorch * 4}
              fill="#7A4A25"
            />
          )}
        </G>
      );
    }
  }

  const showFruit = g > 0.68;
  const fp = Math.min(1, (g - 0.68) / 0.22) * fruit;
  const topY = base - H;
  const fruitElements: React.ReactNode[] = [];

  if (showFruit && fp > 0.02) {
    if (kind === "grass") {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4;
        const r = 2 + i * 0.9;
        fruitElements.push(
          <Circle
            key={`f-${i}`}
            cx={100 + Math.cos(a) * r * 0.55}
            cy={topY - 5 - i * 1.5 * fp}
            r={2.4 + fp * 1.8}
            fill={hue}
          />
        );
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const y = base - H * (0.5 + i * 0.11);
        const s = i % 2 ? 1 : -1;
        fruitElements.push(
          <Ellipse
            key={`f-${i}`}
            cx={100 + s * 11}
            cy={y + 15}
            rx={4 + fp * 2.5}
            ry={8 + fp * 6}
            fill={hue}
          />
        );
      }
    }
  }

  const rootN = 5 + Math.round(roots * 4);
  const rootL = (18 + 66 * g) * Math.max(0.25, roots);
  const bugs = Array.from({ length: Math.round(pests * 14) }, (_, i) => (
    <Circle
      key={`b-${i}`}
      cx={100 + Math.sin(i * 7.3) * 56}
      cy={base - H * (0.2 + ((i * 0.37) % 0.7))}
      r={2.4}
      fill="#3A2E25"
    />
  ));

  return (
    <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
      <Svg viewBox="0 0 200 320" width="100%" height="100%">
        <Defs>
          <LinearGradient id="soilg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E3DACB" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#F7F5EF" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Soil Ground */}
        <Rect x={0} y={base} width={200} height={320 - base} fill="url(#soilg)" />
        <Line
          x1={0}
          y1={base}
          x2={200}
          y2={base}
          stroke="#8C7B63"
          strokeOpacity={0.5}
          strokeWidth={1}
        />

        {/* Root System */}
        <G stroke="#8C7B63" strokeOpacity={0.7} strokeWidth={1} fill="none">
          {Array.from({ length: rootN }, (_, i) => {
            const a = (i - (rootN - 1) / 2) / rootN * 1.8;
            return (
              <Path
                key={`r-${i}`}
                d={`M100 ${base} Q${100 + a * rootL * 0.3} ${base + rootL * 0.45} ${
                  100 + a * rootL * 0.75
                } ${base + rootL * 0.85}`}
              />
            );
          })}
        </G>

        {/* Plant Stem, Leaves & Fruit */}
        <G transform={tilt ? `rotate(${tilt}, 100, ${base})` : undefined}>
          <Line
            x1={100}
            y1={base}
            x2={100}
            y2={topY}
            stroke={leafColor}
            strokeWidth={kind === "grass" ? 5 : 4}
            strokeLinecap="round"
          />
          {leaves}
          {fruitElements}
          {bugs}
        </G>
      </Svg>
    </View>
  );
}

export default ProceduralPlant;
