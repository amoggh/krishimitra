import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Linking, Platform, Alert } from "react-native";
import { Video, Search, ExternalLink, BookOpen, Save } from "lucide-react-native";
import { colors } from "@/theme/tokens";

const TOPICS = [
  { label: "Soil Testing & Health Card", query: "soil testing procedure for farmers Karnataka RSK" },
  { label: "Borewell & Drip Setup", query: "borewell drip irrigation installation Karnataka" },
  { label: "Kharif & Rabi Calendar", query: "Kharif Rabi crop calendar Karnataka agriculture" },
  { label: "Certified Seed & Spacing", query: "certified seed treatment Trichoderma spacing methods" },
  { label: "NPK & Urea Split Dose", query: "NPK fertilizer application timing split urea dosage" },
  { label: "Fall Armyworm & IPM Traps", query: "fall armyworm management pheromone trap Karnataka" },
  { label: "Grain Drying & Aflatoxin", query: "post harvest grain drying moisture storage bags" },
  { label: "e-NAM & APMC Selling", query: "how to sell on e-NAM APMC auction Karnataka" },
];

export function VideoShelf() {
  const [notes, setNotes] = useState("");
  const [savedStatus, setSavedStatus] = useState(false);

  const openSearch = (query: string) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      Linking.openURL(url).catch(() => {
        Alert.alert("Unable to open browser", url);
      });
    }
  };

  const handleSaveNotes = () => {
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-sage">
            <Video size={18} color={colors.primary} />
          </View>
          <View>
            <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
              Curated Agricultural Tutorials & Video Library
            </Text>
            <Text className="font-sans text-[11px] text-ink-muted">
              Direct search queries into expert KVK and RSK demonstrations
            </Text>
          </View>
        </View>
      </View>

      {/* Topic Search Shortcut Chips */}
      <View className="mb-4 flex-row flex-wrap gap-1.5">
        {TOPICS.map((t) => (
          <Pressable
            key={t.label}
            onPress={() => openSearch(t.query)}
            className="flex-row items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 border border-borderSubtle active:bg-sand"
          >
            <Search size={12} color={colors.primary} />
            <Text className="font-sans-bold text-xs text-ink">{t.label}</Text>
            <ExternalLink size={10} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      {/* Farmer's Field Notebook */}
      <View className="rounded-xl bg-sage/60 p-3.5 border border-sage-dark/40">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <BookOpen size={14} color={colors.primary} />
            <Text className="font-sans-bold text-xs text-primary">
              Personal Farmer Learning Notebook
            </Text>
          </View>
          {savedStatus && (
            <Text className="font-sans-bold text-[10px] text-forest">
              ✓ Saved in Memory
            </Text>
          )}
        </View>

        <TextInput
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          placeholder="Note down spray dates, seed lot numbers, RSK officer contact, or lesson takeaways..."
          className="rounded-lg bg-white p-2.5 font-sans text-xs text-ink border border-borderSubtle min-h-[64px]"
        />

        <View className="mt-2 flex-row justify-end">
          <Pressable
            onPress={handleSaveNotes}
            className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-1 shadow-2xs active:bg-primary-dark"
          >
            <Save size={12} color={colors.white} />
            <Text className="font-sans-bold text-xs text-white">Save Note</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default VideoShelf;
