import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Search, BookMarked, HelpCircle } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { GLOSSARY } from "@/data/learnData";

export function GlossarySection() {
  const [query, setQuery] = useState("");

  const filtered = GLOSSARY.filter(([term, def]) => {
    const q = query.toLowerCase().trim();
    return !q || term.toLowerCase().includes(q) || def.toLowerCase().includes(q);
  });

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-sage">
            <BookMarked size={18} color={colors.primary} />
          </View>
          <View>
            <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
              Agricultural Glossary & Practical Units
            </Text>
            <Text className="font-sans text-[11px] text-ink-muted">
              Common terms used by Karnataka mandis, agronomists, and government schemes
            </Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View className="mb-3 flex-row items-center rounded-xl bg-cream px-3 py-2 border border-borderSubtle">
        <Search size={14} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search terms (e.g. Guntha, Quintal, MSP, APMC, ETc)..."
          className="ml-2 flex-1 font-sans text-xs text-ink"
        />
      </View>

      {/* Glossary Cards Grid */}
      <View className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map(([term, def]) => (
          <View
            key={term}
            className="rounded-xl bg-white p-3 border border-borderSubtle shadow-2xs"
          >
            <Text className="font-sans-extrabold text-xs text-primary mb-0.5">
              {term}
            </Text>
            <Text className="font-sans text-xs leading-4.5 text-ink-muted">
              {def}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default GlossarySection;
