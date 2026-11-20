import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  X,
  Sprout,
  AlertTriangle,
  Droplet,
  Layers,
  Thermometer,
  CloudRain,
  Wind,
  ShieldCheck,
  Bot,
} from "lucide-react-native";
import type { AgronomicAdvisory } from "@/services/agronomicAdvisoryService";
import { colors, shadows } from "@/theme/tokens";

export interface AgronomicAdvisoryModalProps {
  visible: boolean;
  onClose: () => void;
  advisory: AgronomicAdvisory | null;
  onAskAI?: (prompt: string) => void;
}

export function AgronomicAdvisoryModal({
  visible,
  onClose,
  advisory,
  onAskAI,
}: AgronomicAdvisoryModalProps) {
  if (!advisory) return null;

  const isWarning = advisory.severity === "warning";
  const isAdvisory = advisory.severity === "advisory";

  const statusBg = isWarning ? "bg-amber-100" : isAdvisory ? "bg-amber-50" : "bg-sage";
  const statusTextColor = isWarning ? "text-amber-900" : isAdvisory ? "text-amber-800" : "text-forest";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/60 p-4"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-lg max-h-[88%] rounded-3xl bg-cream border border-sand p-5"
          style={shadows.card}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ── Modal Header ── */}
          <View className="flex-row items-start justify-between pb-3 border-b border-sand">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className={`px-2.5 py-0.5 rounded-full flex-row items-center gap-1 ${statusBg}`}>
                  {advisory.badgeIcon === "alert" ? (
                    <AlertTriangle size={12} color={isWarning ? "#92400E" : "#B45309"} />
                  ) : advisory.badgeIcon === "droplet" ? (
                    <Droplet size={12} color="#0284C7" />
                  ) : (
                    <Sprout size={12} color={colors.primary} />
                  )}
                  <Text className={`text-[11px] font-sans-extrabold uppercase tracking-wider ${statusTextColor}`}>
                    {advisory.badgeText}
                  </Text>
                </View>
                <Text className="text-xs text-textMuted font-sans-medium">
                  {advisory.district} Farm
                </Text>
              </View>
              <Text className="font-sans-extrabold text-lg text-ink">
                Daily Agronomic Field Advisory
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close advisory modal"
              className="w-8 h-8 rounded-full bg-sand/40 items-center justify-center active:bg-sand"
            >
              <X size={17} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="my-3 flex-1"
            contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          >
            {/* ── Headline Highlight Card ── */}
            <View className="bg-white rounded-2xl p-4 border-l-4 border-l-gold border border-sand shadow-xs">
              <Text className="text-[11px] font-sans-extrabold uppercase text-gold tracking-wider mb-1">
                Field Recommendation
              </Text>
              <Text className="text-sm font-sans-bold text-ink leading-5">
                {advisory.headline}
              </Text>
            </View>

            {/* ── 1. Soil & Infiltration Dynamics ── */}
            <View className="bg-white rounded-2xl p-3.5 border border-sand shadow-xs">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-6 h-6 rounded-full bg-forest/10 items-center justify-center">
                  <Layers size={13} color={colors.primary} />
                </View>
                <Text className="font-sans-bold text-xs text-forest uppercase tracking-wider">
                  Soil Dynamics · {advisory.soilSummary.type}
                </Text>
              </View>

              <View className="flex-row gap-2 mb-2.5">
                <View className="flex-1 bg-cream rounded-xl p-2 border border-sand/70">
                  <Text className="text-[10px] text-textMuted font-sans-medium">Infiltration Rate</Text>
                  <Text className="text-xs font-sans-extrabold text-ink mt-0.5">
                    {advisory.soilSummary.infiltrationRate}
                  </Text>
                </View>
                <View className="flex-1 bg-cream rounded-xl p-2 border border-sand/70">
                  <Text className="text-[10px] text-textMuted font-sans-medium">Water Retention</Text>
                  <Text className="text-xs font-sans-extrabold text-ink mt-0.5">
                    {advisory.soilSummary.holdingCapacity}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-earth-dark leading-4 font-sans">
                {advisory.soilSummary.guidance}
              </Text>
            </View>

            {/* ── 2. Weather & Foliar Spray Safety ── */}
            <View className="bg-white rounded-2xl p-3.5 border border-sand shadow-xs">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-forest/10 items-center justify-center">
                    <CloudRain size={13} color={colors.primary} />
                  </View>
                  <Text className="font-sans-bold text-xs text-forest uppercase tracking-wider">
                    Atmospheric Window & Spray Safety
                  </Text>
                </View>
              </View>

              {/* Weather Stats Pill Grid */}
              <View className="flex-row items-center justify-between bg-cream rounded-xl p-2.5 border border-sand/70 mb-2.5">
                <View className="items-center flex-1">
                  <View className="flex-row items-center gap-1">
                    <Thermometer size={12} color={colors.primary} />
                    <Text className="text-[10px] text-textMuted font-sans-medium">Temp</Text>
                  </View>
                  <Text className="text-xs font-sans-extrabold text-ink mt-0.5">
                    {advisory.weatherImpact.tempText}
                  </Text>
                </View>
                <View className="w-[1px] h-6 bg-sand" />
                <View className="items-center flex-1">
                  <Text className="text-[10px] text-textMuted font-sans-medium">Humidity</Text>
                  <Text className="text-xs font-sans-extrabold text-ink mt-0.5">
                    {advisory.weatherImpact.humidityText}
                  </Text>
                </View>
                <View className="w-[1px] h-6 bg-sand" />
                <View className="items-center flex-1">
                  <View className="flex-row items-center gap-1">
                    <Wind size={12} color={colors.primary} />
                    <Text className="text-[10px] text-textMuted font-sans-medium">Wind</Text>
                  </View>
                  <Text className="text-xs font-sans-extrabold text-ink mt-0.5">
                    {advisory.weatherImpact.windText}
                  </Text>
                </View>
              </View>

              {/* Spray Suitability Badge */}
              <View className="p-2.5 rounded-xl bg-sand/30 border border-sand/80">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <ShieldCheck
                    size={14}
                    color={
                      advisory.weatherImpact.spraySafety === "Safe to Spray"
                        ? "#15803D"
                        : "#B45309"
                    }
                  />
                  <Text
                    className={`text-xs font-sans-extrabold ${
                      advisory.weatherImpact.spraySafety === "Safe to Spray"
                        ? "text-emerald-800"
                        : "text-amber-800"
                    }`}
                  >
                    {advisory.weatherImpact.spraySafety}
                  </Text>
                </View>
                <Text className="text-xs text-earth-dark leading-4 font-sans">
                  {advisory.weatherImpact.sprayReason}
                </Text>
              </View>
            </View>

            {/* ── 3. Active Crop Specific Action Plan ── */}
            <View className="bg-white rounded-2xl p-3.5 border border-sand shadow-xs">
              <View className="flex-row items-center gap-2 mb-2.5">
                <View className="w-6 h-6 rounded-full bg-forest/10 items-center justify-center">
                  <Sprout size={13} color={colors.primary} />
                </View>
                <Text className="font-sans-bold text-xs text-forest uppercase tracking-wider">
                  Crop Care Plan for Your Farm
                </Text>
              </View>

              <View className="gap-2.5">
                {advisory.cropActions.map((ca, idx) => (
                  <View key={idx} className="bg-cream/60 rounded-xl p-2.5 border border-sand/60">
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="text-xs font-sans-extrabold text-ink">
                        {ca.crop}
                      </Text>
                      <Text className="text-[10px] font-sans-bold text-forest bg-sage/60 px-2 py-0.5 rounded-md">
                        {ca.action}
                      </Text>
                    </View>
                    <Text className="text-xs text-earth-dark leading-4 font-sans">
                      {ca.detail}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── 4. Irrigation Schedule & Pest Warning ── */}
            <View className="bg-white rounded-2xl p-3.5 border border-sand shadow-xs">
              <View className="flex-row items-center gap-2 mb-1.5">
                <Droplet size={13} color={colors.primary} />
                <Text className="font-sans-bold text-xs text-forest uppercase tracking-wider">
                  Irrigation Timing
                </Text>
              </View>
              <Text className="text-xs text-earth-dark leading-4 font-sans mb-3">
                {advisory.irrigationGuidance}
              </Text>

              <View className="pt-2 border-t border-sand/70">
                <View className="flex-row items-center gap-2 mb-1">
                  <AlertTriangle size={13} color="#B45309" />
                  <Text className="font-sans-bold text-xs text-amber-900 uppercase tracking-wider">
                    Pest & Disease Risk
                  </Text>
                </View>
                <Text className="text-xs text-earth-dark leading-4 font-sans">
                  {advisory.pestRiskSummary}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* ── Modal Footer ── */}
          <View className="pt-2 border-t border-sand flex-row items-center gap-2.5">
            {onAskAI && (
              <Pressable
                onPress={() => {
                  onClose();
                  onAskAI(
                    `Can you give me detailed instructions for today's advisory on my farm in ${advisory.district}: "${advisory.headline}"?`
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel="Ask Krishi AI about this advisory"
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-forest py-2.5 px-3 active:opacity-90 shadow-xs"
              >
                <Bot size={15} color="#FFFFFF" />
                <Text className="font-sans-bold text-xs text-white">Ask Krishi AI</Text>
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Dismiss advisory modal"
              className="px-5 py-2.5 rounded-full bg-sand/50 active:bg-sand"
            >
              <Text className="font-sans-bold text-xs text-ink">Dismiss</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default AgronomicAdvisoryModal;
