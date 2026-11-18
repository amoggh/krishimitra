import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Sparkles, MapPin, Droplet } from "lucide-react-native";
import { colors } from "@/theme/tokens";

export interface FarmPreset {
  id: string;
  label: string;
  district: string;
  acres: number;
  budget: number;
  source: "rainfed" | "borewell" | "canal";
  hp: number;
  hours: number;
  irrigation: "drip" | "sprinkler" | "flood";
  experience: "none" | "some" | "pro";
}

export const PRESETS: FarmPreset[] = [
  {
    id: "techie",
    label: "Laid-off techie, Mysuru",
    district: "Mysuru",
    acres: 3,
    budget: 120000,
    source: "borewell",
    hp: 3,
    hours: 6,
    irrigation: "drip",
    experience: "none",
  },
  {
    id: "dry",
    label: "Dry land, Koppal, no pump",
    district: "Koppal",
    acres: 8,
    budget: 90000,
    source: "rainfed",
    hp: 5,
    hours: 6,
    irrigation: "flood",
    experience: "none",
  },
  {
    id: "canal",
    label: "Canal farm, Mandya",
    district: "Mandya",
    acres: 5,
    budget: 250000,
    source: "canal",
    hp: 5,
    hours: 6,
    irrigation: "flood",
    experience: "some",
  },
  {
    id: "coast",
    label: "Coastal plot, Udupi",
    district: "Udupi",
    acres: 2,
    budget: 80000,
    source: "canal",
    hp: 5,
    hours: 6,
    irrigation: "flood",
    experience: "none",
  },
];

export interface PlanningPresetsProps {
  onSelectPreset: (preset: FarmPreset) => void;
  activePresetId?: string;
}

export function PlanningPresets({
  onSelectPreset,
  activePresetId,
}: PlanningPresetsProps) {
  return (
    <View className="my-2">
      <View className="mb-2 flex-row items-center gap-1.5 px-1">
        <Sparkles size={14} color={colors.accent} />
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Quick Start Archetypes
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
        {PRESETS.map((p) => {
          const isSelected = activePresetId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelectPreset(p)}
              className={`rounded-2xl px-3.5 py-2.5 border transition-all ${
                isSelected
                  ? "bg-sage border-primary shadow-xs"
                  : "bg-white border-borderSubtle active:bg-cream"
              }`}
            >
              <Text className="font-sans-bold text-xs text-ink">
                {p.label}
              </Text>
              <Text className="font-sans text-[10px] text-ink-muted">
                {p.acres} ac · {p.source} · ₹{(p.budget / 1000).toFixed(0)}k budget
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default PlanningPresets;
