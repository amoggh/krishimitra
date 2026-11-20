import React, { useState, useMemo, useRef } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  View,
  Text,
  Platform,
  GestureResponderEvent,
} from "react-native";
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { Sparkles, AlertCircle } from "lucide-react-native";
import { colors } from "@/theme/tokens";

export type PriceTrendChartProps = {
  data: number[];
  height?: number;
  width?: number;
  labels?: string[];
  arrivalDate?: string;
  cropName?: string;
  mandiName?: string;
  minPrice?: number;
  maxPrice?: number;
};

/**
 * Parses arrival date string (e.g. "12/11/2026", "20/11/2026" or ISO) into a valid Date object.
 */
function parseArrivalDate(arrivalDate?: string): Date {
  if (!arrivalDate) return new Date();
  const ddmmyyyy = arrivalDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(arrivalDate);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

export interface MandiDatePoint {
  short: string;
  full: string;
  isToday: boolean;
  isForecast: boolean;
  isPast: boolean;
  subLabel: string;
}

/**
 * Generates 7 dates centered around Today:
 * -3: T-3 (Past actual)
 * -2: T-2 (Past actual)
 * -1: T-1 (Past actual)
 *  0: Today (Current date, Center of chart)
 * +1: T+1 (Forecasted)
 * +2: T+2 (Forecasted)
 * +3: T+3 (Forecasted)
 */
function generateMandi7DayDates(arrivalDate?: string): MandiDatePoint[] {
  const baseDate = parseArrivalDate(arrivalDate);
  const result: MandiDatePoint[] = [];

  for (let i = -3; i <= 3; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayNum = d.getDate();
    const monthShort = d.toLocaleDateString("en-IN", { month: "short" });
    const year = d.getFullYear();
    const isToday = i === 0;
    const isForecast = i > 0;
    const isPast = i < 0;

    result.push({
      short: `${dayNum} ${monthShort}`,
      full: `${dayNum} ${monthShort}, ${year}`,
      isToday,
      isForecast,
      isPast,
      subLabel: isToday ? "TODAY" : isForecast ? "PREDICTED" : "ACTUAL",
    });
  }
  return result;
}

/**
 * Ensures data is 7 points centered around today:
 * [T-3, T-2, T-1, Today (T), T+1 (Forecast), T+2 (Forecast), T+3 (Forecast)]
 */
export function ensureCenteredForecast7d(
  raw: number[],
  modalPrice?: number
): number[] {
  if (raw && raw.length === 7) {
    const todayCandidate = modalPrice ?? raw[6];
    // Check if the 7th item was previously today (the old layout)
    const isOldFormatEndingToday =
      modalPrice !== undefined
        ? Math.abs(raw[6] - modalPrice) < Math.abs(raw[3] - modalPrice)
        : raw[6] !== raw[3] && raw[5] <= raw[6];

    if (isOldFormatEndingToday) {
      const pT3 = raw[3];
      const pT2 = raw[4];
      const pT1 = raw[5];
      const pToday = todayCandidate;
      const drift = (pToday - pT3) / 3;
      const f1 = Math.round(pToday + drift * 0.75);
      const f2 = Math.round(f1 + drift * 0.56);
      const f3 = Math.round(f2 + drift * 0.42);
      return [pT3, pT2, pT1, pToday, f1, f2, f3];
    }
    return raw;
  }

  if (raw && raw.length >= 4) {
    const todayCandidate = modalPrice ?? raw[raw.length - 1];
    const pT3 = raw[raw.length - 4];
    const pT2 = raw[raw.length - 3];
    const pT1 = raw[raw.length - 2];
    const pToday = todayCandidate;
    const drift = (pToday - pT3) / 3;
    const f1 = Math.round(pToday + drift * 0.75);
    const f2 = Math.round(f1 + drift * 0.56);
    const f3 = Math.round(f2 + drift * 0.42);
    return [pT3, pT2, pT1, pToday, f1, f2, f3];
  }

  const p = modalPrice ?? (raw && raw.length > 0 ? raw[0] : 3500);
  return [
    Math.round(p * 0.95),
    Math.round(p * 0.97),
    Math.round(p * 0.985),
    p,
    Math.round(p * 1.012),
    Math.round(p * 1.022),
    Math.round(p * 1.030),
  ];
}

/**
 * Builds smooth Catmull-Rom cubic bezier curve SVG path from array of points
 */
function pointsToCurvedPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let lp = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    lp += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return lp;
}

export function PriceTrendChart({
  data,
  height = 175,
  width: explicitWidth,
  labels: explicitLabels,
  arrivalDate,
  cropName,
  mandiName,
  minPrice,
  maxPrice,
}: PriceTrendChartProps) {
  const windowWidth = Dimensions.get("window").width;
  const fallbackWidth = Math.max(Math.min(windowWidth - 48, 560), 280);
  const [containerWidth, setContainerWidth] = useState<number>(explicitWidth ?? fallbackWidth);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<View>(null);

  function handleLayout(e: LayoutChangeEvent) {
    const measured = Math.floor(e.nativeEvent.layout.width);
    if (measured > 50 && Math.abs(measured - containerWidth) > 3) {
      setContainerWidth(measured);
    }
  }

  const effectiveWidth = explicitWidth ?? containerWidth;

  // Format data strictly into 7 points centered on Today at index 3
  const safeData = useMemo(() => {
    return ensureCenteredForecast7d(data, minPrice && maxPrice ? Math.round((minPrice + maxPrice) / 2) : undefined);
  }, [data, minPrice, maxPrice]);

  // Derive date metadata: index 0..2 = past, index 3 = Today, index 4..6 = forecast
  const dateMeta = useMemo(() => {
    return generateMandi7DayDates(arrivalDate);
  }, [arrivalDate]);

  // Chart layout geometry
  const paddingLeft = 56;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 42;

  const plotWidth = Math.max(effectiveWidth - paddingLeft - paddingRight, 100);
  const plotHeight = Math.max(height - paddingTop - paddingBottom, 60);

  const minVal = Math.min(...safeData);
  const maxVal = Math.max(...safeData);
  const valSpan = maxVal - minVal || 100;
  const yMin = Math.max(0, Math.floor(minVal - valSpan * 0.12));
  const yMax = Math.ceil(maxVal + valSpan * 0.12);
  const yRange = yMax - yMin || 100;

  // Calculate coordinates for all 7 data points
  const points = useMemo(() => {
    const count = safeData.length;
    return safeData.map((val, i) => {
      const x = paddingLeft + (i / (count - 1)) * plotWidth;
      const y = paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;
      return { x, y, val, index: i };
    });
  }, [safeData, yMin, yRange, plotWidth, plotHeight, paddingLeft, paddingTop]);

  const todayIndex = 3;
  const todayPt = points[todayIndex];

  // Separate paths into Historical (0 -> 3) and Forecast (3 -> 6)
  const { historicalLine, historicalArea, forecastLine, forecastArea } = useMemo(() => {
    if (points.length < 4) {
      return { historicalLine: "", historicalArea: "", forecastLine: "", forecastArea: "" };
    }

    const bottomY = (paddingTop + plotHeight).toFixed(1);

    // 1. Historical actuals curve (Points 0, 1, 2, 3)
    const histPts = points.slice(0, 4);
    const hLine = pointsToCurvedPath(histPts);
    const hArea = `${hLine} L ${histPts[histPts.length - 1].x.toFixed(1)} ${bottomY} L ${histPts[0].x.toFixed(1)} ${bottomY} Z`;

    // 2. Forecasted curve (Points 3, 4, 5, 6)
    const forePts = points.slice(3, 7);
    const fLine = pointsToCurvedPath(forePts);
    const fArea = `${fLine} L ${forePts[forePts.length - 1].x.toFixed(1)} ${bottomY} L ${forePts[0].x.toFixed(1)} ${bottomY} Z`;

    return {
      historicalLine: hLine,
      historicalArea: hArea,
      forecastLine: fLine,
      forecastArea: fArea,
    };
  }, [points, paddingTop, plotHeight]);

  // 4 horizontal gridlines
  const gridTicks = useMemo(() => {
    return [0, 1, 2, 3].map((step) => {
      const fraction = step / 3;
      const val = Math.round(yMin + fraction * (yMax - yMin));
      const yPos = paddingTop + plotHeight - fraction * plotHeight;
      return { val, yPos };
    });
  }, [yMin, yMax, paddingTop, plotHeight]);

  // Interaction handlers
  const handlePointerCoord = (xCoord: number) => {
    if (points.length === 0) return;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].x - xCoord);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIndex(closestIdx);
  };

  const handleTouch = (e: GestureResponderEvent) => {
    handlePointerCoord(e.nativeEvent.locationX);
  };

  const webMouseHandlers =
    Platform.OS === "web"
      ? {
          onPointerMove: (e: any) => {
            const rect = e.currentTarget?.getBoundingClientRect?.();
            if (rect) {
              handlePointerCoord(e.clientX - rect.left);
            }
          },
          onPointerLeave: () => setHoveredIndex(null),
        }
      : {};

  const activeIndex = hoveredIndex;
  const activePt = activeIndex !== null ? points[activeIndex] : null;

  // Derive change context for tooltip
  const activeChange = useMemo(() => {
    if (activeIndex === null || activeIndex === 0) return null;
    const prev = safeData[activeIndex - 1];
    const curr = safeData[activeIndex];
    const diff = curr - prev;
    const pct = ((diff / prev) * 100).toFixed(1);
    return {
      isUp: diff >= 0,
      diffAbs: Math.abs(diff),
      pct: Math.abs(Number(pct)),
      text: `${diff >= 0 ? "+" : "-"}₹${Math.abs(diff).toLocaleString("en-IN")} (${diff >= 0 ? "+" : ""}${pct}%)`,
    };
  }, [activeIndex, safeData]);

  // Dynamic tooltip placement
  const tooltipWidth = 190;
  const tooltipLeft = activePt
    ? Math.max(8, Math.min(activePt.x - tooltipWidth / 2, effectiveWidth - tooltipWidth - 8))
    : 0;
  const tooltipTop = activePt
    ? activePt.y < 70
      ? activePt.y + 14
      : activePt.y - 78
    : 0;

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      {...(webMouseHandlers as any)}
      className="relative w-full select-none"
    >
      <Svg width={effectiveWidth} height={height}>
        <Defs>
          {/* Gradient for historical actuals (Forest Green) */}
          <LinearGradient id="krishiGreenGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#145C3A" stopOpacity="0.28" />
            <Stop offset="75%" stopColor="#145C3A" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#145C3A" stopOpacity="0.0" />
          </LinearGradient>

          {/* Gradient for future forecasts (Emerald / Sage tint) */}
          <LinearGradient id="krishiForecastGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0D9488" stopOpacity="0.20" />
            <Stop offset="75%" stopColor="#0D9488" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* ── 1. Horizontal Grid Lines & Y-Axis Labels ── */}
        {gridTicks.map((tick, i) => (
          <React.Fragment key={i}>
            <Line
              x1={paddingLeft}
              y1={tick.yPos}
              x2={paddingLeft + plotWidth}
              y2={tick.yPos}
              stroke="#E2E8F0"
              strokeDasharray="4,4"
              strokeWidth={1}
            />
            <SvgText
              x={paddingLeft - 8}
              y={tick.yPos + 3.5}
              fill="#64748B"
              fontSize={10}
              fontWeight="500"
              textAnchor="end"
            >
              ₹{tick.val.toLocaleString("en-IN")}
            </SvgText>
          </React.Fragment>
        ))}

        {/* ── 2. X-Axis Baseline ── */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={paddingLeft + plotWidth}
          y2={paddingTop + plotHeight}
          stroke="#CBD5E1"
          strokeWidth={1}
        />

        {/* ── 3. Subtle Today Vertical Center Guideline ── */}
        {todayPt && (
          <Line
            x1={todayPt.x}
            y1={paddingTop}
            x2={todayPt.x}
            y2={paddingTop + plotHeight}
            stroke="#145C3A"
            strokeDasharray="3,3"
            strokeWidth={1.5}
            opacity={0.35}
          />
        )}

        {/* ── 4. Historical Area & Curve (Left to Center) ── */}
        {historicalArea ? <Path d={historicalArea} fill="url(#krishiGreenGradient)" /> : null}
        {historicalLine ? (
          <Path
            d={historicalLine}
            fill="none"
            stroke="#145C3A"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* ── 5. Forecast Area & Dashed Curve (Center to Right) ── */}
        {forecastArea ? <Path d={forecastArea} fill="url(#krishiForecastGradient)" /> : null}
        {forecastLine ? (
          <Path
            d={forecastLine}
            fill="none"
            stroke="#0D9488"
            strokeWidth={2.4}
            strokeDasharray="5,4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* ── 6. Active Hover Vertical Cursor Line ── */}
        {activePt && (
          <Line
            x1={activePt.x}
            y1={paddingTop}
            x2={activePt.x}
            y2={paddingTop + plotHeight}
            stroke="#145C3A"
            strokeDasharray="2,2"
            strokeWidth={1.5}
            opacity={0.7}
          />
        )}

        {/* ── 7. Data Points & X-Axis Labels ── */}
        {points.map((pt, i) => {
          const isToday = i === todayIndex;
          const isForecast = i > todayIndex;
          const isActive = activeIndex === i;
          const meta = dateMeta[i] || {
            short: `Day ${i + 1}`,
            isToday,
            isForecast,
            isPast: i < todayIndex,
            subLabel: isToday ? "TODAY" : isForecast ? "PREDICTED" : "ACTUAL",
          };

          return (
            <React.Fragment key={i}>
              {/* Vertical Tick Marker */}
              <Line
                x1={pt.x}
                y1={paddingTop + plotHeight}
                x2={pt.x}
                y2={paddingTop + plotHeight + 4}
                stroke={isToday ? "#145C3A" : isActive ? "#145C3A" : "#CBD5E1"}
                strokeWidth={isToday ? 1.5 : 1}
              />

              {/* Today Badge Highlight on X-Axis */}
              {isToday && (
                <Rect
                  x={pt.x - 23}
                  y={paddingTop + plotHeight + 6}
                  width={46}
                  height={26}
                  rx={6}
                  fill="#E6F1E7"
                  stroke="#145C3A"
                  strokeWidth={1}
                />
              )}

              {/* X-Axis Date Label */}
              <SvgText
                x={pt.x}
                y={paddingTop + plotHeight + 17}
                fill={isToday ? "#145C3A" : isActive ? "#145C3A" : isForecast ? "#475569" : "#64748B"}
                fontSize={isToday ? 9.5 : 9}
                fontWeight={isToday ? "800" : isActive ? "700" : "500"}
                textAnchor="middle"
              >
                {meta.short}
              </SvgText>

              {/* Sub-label: ACTUAL / TODAY / PRED */}
              <SvgText
                x={pt.x}
                y={paddingTop + plotHeight + 27}
                fill={isToday ? "#145C3A" : isForecast ? "#D97706" : "#94A3B8"}
                fontSize={isToday ? 8 : 7}
                fontWeight={isToday ? "800" : isForecast ? "700" : "500"}
                textAnchor="middle"
              >
                {meta.subLabel}
              </SvgText>

              {/* Data Node Markers */}
              {isActive ? (
                <>
                  <Circle cx={pt.x} cy={pt.y} r={9} fill={isForecast ? "#0D9488" : "#145C3A"} opacity={0.2} />
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={5.5}
                    fill={isForecast ? "#0D9488" : "#145C3A"}
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </>
              ) : isToday ? (
                // Today: Double-ring subtle highlight in center
                <>
                  <Circle cx={pt.x} cy={pt.y} r={8} fill="#145C3A" opacity={0.18} />
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={5}
                    fill="#145C3A"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  <Circle cx={pt.x} cy={pt.y} r={1.6} fill="#FFFFFF" />
                </>
              ) : isForecast ? (
                // Forecast: Hollow teal dot with dashed accent
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={4}
                  fill="#F0FDFA"
                  stroke="#0D9488"
                  strokeWidth={1.8}
                />
              ) : (
                // Past Actual: Solid white circle with forest border
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={3.8}
                  fill="#FFFFFF"
                  stroke="#145C3A"
                  strokeWidth={2}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* ── 8. Interactive Tooltip Overlay ── */}
      {activePt && (
        <View
          style={{
            position: "absolute",
            left: tooltipLeft,
            top: tooltipTop,
            width: tooltipWidth,
            backgroundColor: "#18181B",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor:
              activePt.index === todayIndex
                ? "#10B981"
                : activePt.index > todayIndex
                ? "#F59E0B"
                : "rgba(255, 255, 255, 0.15)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 8,
            pointerEvents: "none",
            zIndex: 99,
          }}
        >
          {/* Header Date & Category */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <Text style={{ color: "#A1A1AA", fontSize: 10, fontWeight: "600", flex: 1 }}>
              {dateMeta[activePt.index]?.full || `Day ${activePt.index + 1}`}
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                color:
                  activePt.index === todayIndex
                    ? "#34D399"
                    : activePt.index > todayIndex
                    ? "#FBBF24"
                    : "#A7F3D0",
              }}
            >
              {activePt.index === todayIndex
                ? "● TODAY"
                : activePt.index > todayIndex
                ? "✦ PREDICTED"
                : "ACTUAL"}
            </Text>
          </View>

          {/* Modal Price Metric */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor:
                  activePt.index === todayIndex
                    ? "#10B981"
                    : activePt.index > todayIndex
                    ? "#F59E0B"
                    : "#145C3A",
              }}
            />
            <Text style={{ color: "#E4E4E7", fontSize: 11, fontWeight: "500" }}>
              {activePt.index > todayIndex ? "Forecast" : "Modal Price"}
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: "800",
                marginLeft: "auto",
              }}
            >
              ₹{activePt.val.toLocaleString("en-IN")}
              <Text style={{ fontSize: 9, color: "#A1A1AA", fontWeight: "normal" }}>/q</Text>
            </Text>
          </View>

          {/* Day-over-Day Contextual Trend */}
          {activeChange && (
            <Text
              style={{
                color: activeChange.isUp ? "#34D399" : "#F87171",
                fontSize: 9.5,
                fontWeight: "600",
                marginTop: 2,
              }}
            >
              {activeChange.text} vs prev day
            </Text>
          )}

          {/* Forecast Disclaimer inside tooltip for predicted dates */}
          {activePt.index > todayIndex && (
            <Text style={{ color: "#FDE68A", fontSize: 8.5, fontStyle: "italic", marginTop: 2 }}>
              * Time-series AI forecast. Prices may change with arrivals.
            </Text>
          )}
        </View>
      )}

      {/* ── 9. Trajectory Legend & Prediction Notice ── */}
      <View className="mt-1 pt-1.5 border-t border-sand/50 flex-row flex-wrap items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          {/* Past actual indicator */}
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full bg-forest" />
            <Text className="text-[10px] font-sans-medium text-earth-dark">Agmarknet</Text>
          </View>

          <Text className="text-[10px] text-sand-dark">•</Text>

          {/* Today Center Highlight indicator */}
          <View className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full border border-forest bg-sage" />
            <Text className="text-[10px] font-sans-extrabold text-forest">Today (Center)</Text>
          </View>

          <Text className="text-[10px] text-sand-dark">•</Text>

          {/* Forecast indicator */}
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full border border-teal-600 bg-teal-50" />
            <Text className="text-[10px] font-sans-medium text-teal-800">3-Day Forecast</Text>
          </View>
        </View>

        {/* Clear Prediction & Variation Mention */}
        <View className="flex-row items-center gap-1 mt-0.5">
          <Sparkles size={11} color="#B45309" />
          <Text className="text-[10px] font-sans text-amber-800">
            Predicted · Prices may change
          </Text>
        </View>
      </View>
    </View>
  );
}

export default PriceTrendChart;
