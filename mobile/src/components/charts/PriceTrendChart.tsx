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
 * Parses arrival date string (e.g. "12/11/2026" or ISO) into a valid Date object.
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

/**
 * Generates 7 consecutive day labels leading up to arrivalDate.
 */
function generate7DayDates(arrivalDate?: string): { short: string; full: string }[] {
  const baseDate = parseArrivalDate(arrivalDate);
  const result: { short: string; full: string }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dayNum = d.getDate();
    const monthShort = d.toLocaleDateString("en-IN", { month: "short" });
    const year = d.getFullYear();
    result.push({
      short: `${dayNum} ${monthShort}`,
      full: `${dayNum} ${monthShort}, ${year}`,
    });
  }
  return result;
}

export function PriceTrendChart({
  data,
  height = 155,
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
  const safeData = data && data.length >= 2 ? data : [3600, 3825, 3750, 4050, 3980, 4275, 4500];

  // Derive date metadata for x-axis and tooltips
  const dateMeta = useMemo(() => {
    return generate7DayDates(arrivalDate);
  }, [arrivalDate]);

  const xLabels = useMemo(() => {
    if (explicitLabels && explicitLabels.length === safeData.length) {
      return explicitLabels;
    }
    return dateMeta.map((d) => d.short);
  }, [explicitLabels, dateMeta, safeData.length]);

  // Chart layout geometry
  const paddingLeft = 56;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 32;

  const plotWidth = Math.max(effectiveWidth - paddingLeft - paddingRight, 100);
  const plotHeight = Math.max(height - paddingTop - paddingBottom, 60);

  const minVal = Math.min(...safeData);
  const maxVal = Math.max(...safeData);
  const valSpan = maxVal - minVal || 100;
  const yMin = Math.max(0, Math.floor(minVal - valSpan * 0.12));
  const yMax = Math.ceil(maxVal + valSpan * 0.12);
  const yRange = yMax - yMin || 100;

  // Calculate coordinates for all data points
  const points = useMemo(() => {
    const count = safeData.length;
    return safeData.map((val, i) => {
      const x = paddingLeft + (i / (count - 1)) * plotWidth;
      const y = paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;
      return { x, y, val, index: i };
    });
  }, [safeData, yMin, yRange, plotWidth, plotHeight, paddingLeft, paddingTop]);

  // Generate smooth cubic Catmull-Rom path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: "", areaPath: "" };

    let lp = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      lp += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const bottomY = (paddingTop + plotHeight).toFixed(1);

    const ap = `${lp} L ${lastPoint.x.toFixed(1)} ${bottomY} L ${firstPoint.x.toFixed(1)} ${bottomY} Z`;

    return { linePath: lp, areaPath: ap };
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

  // Web mouse handlers attached via standard DOM props
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
  const tooltipWidth = 168;
  const tooltipLeft = activePt
    ? Math.max(8, Math.min(activePt.x - tooltipWidth / 2, effectiveWidth - tooltipWidth - 8))
    : 0;
  const tooltipTop = activePt
    ? activePt.y < 70
      ? activePt.y + 14
      : activePt.y - 72
    : 0;

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      {...(webMouseHandlers as any)}
      className="relative w-full select-none"
      style={{ minHeight: height }}
    >
      <Svg width={effectiveWidth} height={height}>
        <Defs>
          <LinearGradient id="krishiGreenGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#145C3A" stopOpacity="0.28" />
            <Stop offset="75%" stopColor="#145C3A" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#145C3A" stopOpacity="0.0" />
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

        {/* ── 3. Smooth Area & Curve ── */}
        {areaPath ? <Path d={areaPath} fill="url(#krishiGreenGradient)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke="#145C3A"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* ── 4. Active Hover Vertical Cursor Line ── */}
        {activePt && (
          <Line
            x1={activePt.x}
            y1={paddingTop}
            x2={activePt.x}
            y2={paddingTop + plotHeight}
            stroke="#145C3A"
            strokeDasharray="3,3"
            strokeWidth={1.5}
            opacity={0.65}
          />
        )}

        {/* ── 5. Data Point Dots & X-Axis Day Labels ── */}
        {points.map((pt, i) => {
          const isActive = activeIndex === i;
          const labelText = xLabels[i] || `Day ${i + 1}`;

          return (
            <React.Fragment key={i}>
              {/* Vertical Tick Marker */}
              <Line
                x1={pt.x}
                y1={paddingTop + plotHeight}
                x2={pt.x}
                y2={paddingTop + plotHeight + 4}
                stroke={isActive ? "#145C3A" : "#CBD5E1"}
                strokeWidth={isActive ? 1.5 : 1}
              />

              {/* X-Axis Date / Day Text */}
              <SvgText
                x={pt.x}
                y={paddingTop + plotHeight + 17}
                fill={isActive ? "#145C3A" : "#64748B"}
                fontSize={10}
                fontWeight={isActive ? "700" : "500"}
                textAnchor="middle"
              >
                {labelText}
              </SvgText>

              {/* Circular Data Dot */}
              {isActive ? (
                <>
                  <Circle cx={pt.x} cy={pt.y} r={9} fill="#145C3A" opacity={0.18} />
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={5.5}
                    fill="#145C3A"
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </>
              ) : (
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

      {/* ── 6. Shadcn-Style Interactive Tooltip Overlay ── */}
      {activePt && (
        <View
          style={{
            position: "absolute",
            left: tooltipLeft,
            top: tooltipTop,
            width: tooltipWidth,
            backgroundColor: "#18181B", // Zinc-900 dark background
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.15)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 8,
            pointerEvents: "none",
            zIndex: 99,
          }}
        >
          {/* Tooltip Header Date */}
          <Text
            style={{
              color: "#A1A1AA",
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.2,
              marginBottom: 4,
            }}
          >
            {dateMeta[activePt.index]?.full || xLabels[activePt.index]}
          </Text>

          {/* Modal Price Metric */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: "#10B981", // Emerald accent
              }}
            />
            <Text style={{ color: "#E4E4E7", fontSize: 11, fontWeight: "500" }}>
              Modal Price
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
              <Text style={{ fontSize: 9, color: "#A1A1AA", fontWeight: "normal" }}>
                /q
              </Text>
            </Text>
          </View>

          {/* Day-over-Day Contextual Trend */}
          {activeChange ? (
            <Text
              style={{
                color: activeChange.isUp ? "#34D399" : "#F87171",
                fontSize: 10,
                fontWeight: "600",
                marginTop: 3,
              }}
            >
              {activeChange.text} vs prev day
            </Text>
          ) : (
            <Text style={{ color: "#71717A", fontSize: 9.5, marginTop: 3 }}>
              7-day market baseline
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default PriceTrendChart;
