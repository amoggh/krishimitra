import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Play, Pause, RotateCcw, Droplet, Clock, Sprout } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { CROPS, CROP_BY_ID, type CropInfo } from "@/data/cropsData";
import { ProceduralPlant, plantKind } from "@/components/animation/ProceduralPlant";

export function CropAtlas() {
  const [selectedCropId, setSelectedCropId] = useState("ragi");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const crop = CROP_BY_ID[selectedCropId] || CROPS[0];
  const lastWeek = crop.plan[crop.plan.length - 1][0] + 1;

  useEffect(() => {
    setCurrentWeek(0);
    setIsPlaying(false);
  }, [selectedCropId]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentWeek((w) => {
        if (w >= lastWeek) {
          setIsPlaying(false);
          return lastWeek;
        }
        return w + 1;
      });
    }, 450);
    return () => clearInterval(interval);
  }, [isPlaying, lastWeek]);

  // Current stage from crop plan
  const currentStage = useMemo(() => {
    let stage = crop.plan[0];
    for (const p of crop.plan) {
      if (p[0] <= currentWeek) stage = p;
    }
    return stage;
  }, [crop, currentWeek]);

  const growthRatio = Math.min(1, 0.05 + currentWeek / lastWeek);

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          14-Crop Growth Atlas & Visual Scrub
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          Week {Math.round(currentWeek)} of {lastWeek}
        </Text>
      </View>

      {/* Crop Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 gap-1.5">
        {CROPS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setSelectedCropId(c.id)}
            className={`rounded-full px-3 py-1 border transition-all ${
              selectedCropId === c.id
                ? "bg-primary border-primary shadow-xs"
                : "bg-cream border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                selectedCropId === c.id ? "text-white" : "text-ink"
              }`}
            >
              {c.name.split(" (")[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Main Visual Display: Procedural Plant on Left, Weekly Task on Right */}
      <View className="flex-col md:flex-row gap-4 mb-4">
        {/* Plant Illustration Container */}
        <View className="items-center justify-center p-3 rounded-xl bg-cream border border-borderSubtle">
          <ProceduralPlant
            growth={growthRatio}
            kind={plantKind(selectedCropId)}
            hue={crop.hue}
            width={130}
            height={200}
          />
          <Text className="font-sans-bold text-xs text-ink mt-1">
            {crop.name.split(" (")[0]} {crop.kn ? `(${crop.kn})` : ""}
          </Text>
        </View>

        {/* Weekly Task & Agronomic Stage */}
        <View className="flex-1 justify-between">
          <View>
            <View className="flex-row items-center gap-2 mb-1">
              <View className="rounded-full bg-sage px-2 py-0.5 border border-primary/20">
                <Text className="font-sans-bold text-[10px] text-primary">
                  Week {Math.round(currentWeek)}: {currentStage[1]}
                </Text>
              </View>
              <Text className="font-sans text-xs text-ink-muted">
                {crop.seasons.join(" / ")}
              </Text>
            </View>

            <Text className="font-sans text-xs leading-5 text-ink-muted mb-3">
              {currentStage[2]}
            </Text>
          </View>

          {/* Key Agronomic Benchmarks */}
          <View className="grid grid-cols-3 gap-2 rounded-xl bg-sage/60 p-2.5 border border-sage-dark/40">
            <View>
              <View className="flex-row items-center gap-1">
                <Clock size={11} color={colors.primary} />
                <Text className="font-sans text-[10px] text-ink-muted">Duration</Text>
              </View>
              <Text className="font-sans-bold text-xs text-ink">{crop.days} Days</Text>
            </View>
            <View>
              <View className="flex-row items-center gap-1">
                <Droplet size={11} color={colors.primary} />
                <Text className="font-sans text-[10px] text-ink-muted">Water</Text>
              </View>
              <Text className="font-sans-bold text-xs text-ink">{crop.etc} mm</Text>
            </View>
            <View>
              <View className="flex-row items-center gap-1">
                <Sprout size={11} color={colors.primary} />
                <Text className="font-sans text-[10px] text-ink-muted">pH Range</Text>
              </View>
              <Text className="font-sans-bold text-xs text-ink">
                {crop.ph[0]}–{crop.ph[1]}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Week Timeline Scrubbing Buttons */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="font-sans-bold text-[10px] uppercase text-ink-muted">
            Season Timeline (Click a Week Stage)
          </Text>
          <Text className="font-sans text-[10px] text-primary font-bold">
            {crop.seed}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-1 py-1">
          {crop.plan.map(([wk, title]) => {
            const isSelected = Math.round(currentWeek) === wk;
            const isPast = currentWeek >= wk;
            return (
              <Pressable
                key={wk}
                onPress={() => {
                  setIsPlaying(false);
                  setCurrentWeek(wk);
                }}
                className={`rounded-lg px-2.5 py-1.5 border transition-all ${
                  isSelected
                    ? "bg-primary border-primary shadow-xs"
                    : isPast
                    ? "bg-sage border-primary/30"
                    : "bg-cream border-borderSubtle"
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    isSelected ? "text-white" : "text-ink"
                  }`}
                >
                  W{wk}: {title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Play / Pause / Reset Controls */}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => setIsPlaying((p) => !p)}
          className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2 active:bg-primary-dark shadow-2xs"
        >
          {isPlaying ? (
            <Pause size={14} color={colors.white} />
          ) : (
            <Play size={14} color={colors.white} />
          )}
          <Text className="font-sans-bold text-xs text-white">
            {isPlaying ? "Pause Season" : "Play Whole Season"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsPlaying(false);
            setCurrentWeek(0);
          }}
          className="flex-row items-center gap-1.5 rounded-full bg-white border border-borderSubtle px-3 py-2 active:bg-cream"
        >
          <RotateCcw size={13} color={colors.textSecondary} />
          <Text className="font-sans text-xs text-ink-muted">Reset Week 0</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default CropAtlas;
