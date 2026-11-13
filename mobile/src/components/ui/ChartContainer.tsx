import React, { useState } from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type ChartContainerProps = ViewProps & {
  title: string;
  subtitle?: string;
  periods?: string[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  legend?: { label: string; color: string }[];
  footerNote?: string;
  children: React.ReactNode;
  className?: string;
};

export function ChartContainer({
  title,
  subtitle,
  periods,
  selectedPeriod,
  onPeriodChange,
  legend,
  footerNote,
  children,
  className = "",
  style,
  ...rest
}: ChartContainerProps) {
  const [internalPeriod, setInternalPeriod] = useState<string>(
    periods && periods.length > 0 ? periods[0] : ""
  );

  const activePeriod = selectedPeriod ?? internalPeriod;

  function handleSelect(p: string) {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  }

  return (
    <View
      className={`mb-3.5 bg-white p-4 border border-[#183B2B]/[0.06] ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.card,
        },
        style,
      ]}
      {...rest}
    >
      {/* Header with Title and Time Periods */}
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-sans-bold text-base text-ink tracking-tight">
            {title}
          </Text>
          {subtitle && (
            <Text className="mt-0.5 font-sans text-xs text-ink-muted">
              {subtitle}
            </Text>
          )}
        </View>

        {periods && periods.length > 0 && (
          <View className="flex-row items-center rounded-full bg-cream p-1">
            {periods.map((p) => {
              const isActive = p === activePeriod;
              return (
                <Pressable
                  key={p}
                  onPress={() => handleSelect(p)}
                  className={`rounded-full px-2.5 py-1 ${
                    isActive ? "bg-primary" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`font-sans-bold text-[10px] ${
                      isActive ? "text-white" : "text-ink-muted"
                    }`}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Legend Row if present */}
      {legend && legend.length > 0 && (
        <View className="mb-2.5 flex-row flex-wrap items-center gap-3">
          {legend.map((item) => (
            <View key={item.label} className="flex-row items-center gap-1.5">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <Text className="font-sans text-[11px] text-ink-muted">
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Chart Canvas Area */}
      <View className="items-center justify-center overflow-hidden">
        {children}
      </View>

      {/* Footer Note */}
      {footerNote && (
        <View className="mt-2.5 pt-2 border-t border-cream-muted/50">
          <Text className="font-sans text-[10px] text-ink-muted leading-4">
            {footerNote}
          </Text>
        </View>
      )}
    </View>
  );
}

export default ChartContainer;

