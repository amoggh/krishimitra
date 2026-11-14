import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import {
  MapPin,
  Check,
  Star,
  Plus,
  X,
  Sprout,
  Layers,
  ChevronRight,
} from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";
import { KARNATAKA_DISTRICTS } from "@/constants/districts";
import type { FarmEntity } from "@/services/farmProfileService";

export interface FarmSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  farms: FarmEntity[];
  activeFarm: FarmEntity;
  onSelectFarm: (farmId: string) => void;
  onSetDefaultFarm: (farmId: string) => void;
  onAddFarm: (newFarm: {
    name: string;
    district: string;
    acres: number;
    soilType: string;
    isDefault?: boolean;
  }) => void;
}

const COMMON_SOILS = [
  "Red Sandy & Lateritic Loam",
  "Red Sandy Loam",
  "Deep Black Soil",
  "Red Loam",
  "Alluvial Clay Loam",
  "Coastal Sandy Soil",
];

export function FarmSelectorModal({
  visible,
  onClose,
  farms,
  activeFarm,
  onSelectFarm,
  onSetDefaultFarm,
  onAddFarm,
}: FarmSelectorModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmDistrict, setNewFarmDistrict] = useState("Shivamogga");
  const [newFarmAcres, setNewFarmAcres] = useState("5.0");
  const [newFarmSoil, setNewFarmSoil] = useState(COMMON_SOILS[0]);
  const [newFarmDefault, setNewFarmDefault] = useState(false);

  const handleCreateFarm = () => {
    if (!newFarmName.trim()) return;
    const parsedAcres = parseFloat(newFarmAcres) || 5.0;

    onAddFarm({
      name: newFarmName.trim(),
      district: newFarmDistrict,
      acres: parsedAcres,
      soilType: newFarmSoil,
      isDefault: newFarmDefault,
    });

    // Reset form
    setNewFarmName("");
    setNewFarmAcres("5.0");
    setShowAddForm(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityLabel="Close backdrop"
        />

        <View
          className="w-full max-w-lg bg-cream rounded-3xl overflow-hidden border border-sand"
          style={shadows.floating}
        >
          {/* ── Modal Header ── */}
          <View className="bg-forest px-5 py-4 flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-1.5">
                <MapPin size={18} color={colors.accent} />
                <Text className="text-white font-bold text-base">Select Farm / District</Text>
              </View>
              <Text className="text-white/80 text-xs mt-0.5">
                Crop plans, weather & mandi prices update per farm
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-white/15 items-center justify-center active:opacity-70"
            >
              <X size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* ── Modal Content ── */}
          <ScrollView
            className="max-h-[70vh] p-4"
            showsVerticalScrollIndicator={false}
          >
            {/* Farm List */}
            <View className="gap-2.5">
              {farms.map((farm) => {
                const isActive = farm.id === activeFarm.id;
                const isDefault = Boolean(farm.isDefault || farm.is_default);
                const cropsList = farm.allocatedCrops || farm.allocated_crops || [];

                return (
                  <Pressable
                    key={farm.id}
                    onPress={() => {
                      onSelectFarm(farm.id);
                      onClose();
                    }}
                    className={`rounded-2xl p-3.5 border transition-all ${
                      isActive
                        ? "bg-white border-forest shadow-sm"
                        : "bg-white/70 border-sand hover:bg-white"
                    }`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        {/* Title & Badges */}
                        <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                          <Text
                            className={`font-bold text-sm ${
                              isActive ? "text-forest" : "text-ink"
                            }`}
                          >
                            {farm.name}
                          </Text>

                          {isDefault && (
                            <View className="bg-accent/20 border border-accent/40 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                              <Star size={10} color={colors.accentDark} fill={colors.accentDark} />
                              <Text className="text-[10px] font-bold text-accentDark">
                                Default Farm
                              </Text>
                            </View>
                          )}

                          {isActive && (
                            <View className="bg-forest/10 px-2 py-0.5 rounded-full">
                              <Text className="text-[10px] font-bold text-forest">
                                Active Now
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Location & Acres */}
                        <Text className="text-xs text-textSecondary font-medium">
                          📍 {farm.district}, Karnataka · {Number(farm.acres).toFixed(1)} acres
                        </Text>
                        <Text className="text-[11px] text-textMuted mt-0.5">
                          Soil: {farm.soilType || farm.soil_type || "Red Sandy Loam"}
                        </Text>

                        {/* Allocated crops if any */}
                        {cropsList.length > 0 && (
                          <View className="flex-row items-center gap-1 mt-2 flex-wrap">
                            <Sprout size={12} color={colors.primary} />
                            <Text className="text-[11px] text-forest font-semibold">
                              Crops: {cropsList.map((c) => c.crop).join(", ")}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Right action: Active Checkmark or Set Default */}
                      <View className="items-end gap-2">
                        {isActive ? (
                          <View className="w-6 h-6 rounded-full bg-forest items-center justify-center">
                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        ) : (
                          <View className="w-6 h-6 rounded-full border border-sand items-center justify-center bg-cream">
                            <ChevronRight size={14} color={colors.textMuted} />
                          </View>
                        )}

                        {!isDefault && (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onSetDefaultFarm(farm.id);
                            }}
                            className="bg-sand/40 hover:bg-accent/20 px-2 py-1 rounded-md flex-row items-center gap-1 active:opacity-75"
                          >
                            <Star size={11} color={colors.textSecondary} />
                            <Text className="text-[10px] font-medium text-textSecondary">
                              Make Default
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Add New Farm Button / Collapsible Form ── */}
            <View className="mt-4 pt-3 border-t border-sand">
              {!showAddForm ? (
                <Pressable
                  onPress={() => setShowAddForm(true)}
                  className="bg-white border border-dashed border-forest/50 rounded-2xl py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-80"
                >
                  <Plus size={16} color={colors.primary} />
                  <Text className="text-forest font-bold text-xs">
                    + Add Another Farm / District
                  </Text>
                </Pressable>
              ) : (
                <View className="bg-white rounded-2xl p-4 border border-sand gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-sm text-forest">Add New Farm</Text>
                    <Pressable onPress={() => setShowAddForm(false)}>
                      <Text className="text-xs text-textMuted font-bold">Cancel</Text>
                    </Pressable>
                  </View>

                  {/* Farm Name */}
                  <View>
                    <Text className="text-xs font-semibold text-textSecondary mb-1">
                      Farm Name
                    </Text>
                    <TextInput
                      className="bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-ink"
                      placeholder="e.g. Haveri Cotton Field"
                      value={newFarmName}
                      onChangeText={setNewFarmName}
                    />
                  </View>

                  {/* District Selection */}
                  <View>
                    <Text className="text-xs font-semibold text-textSecondary mb-1">
                      District (Karnataka)
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="flex-row gap-1.5 py-1"
                    >
                      {KARNATAKA_DISTRICTS.map((dist) => (
                        <Pressable
                          key={dist}
                          onPress={() => setNewFarmDistrict(dist)}
                          className={`px-2.5 py-1.5 rounded-full border text-xs ${
                            newFarmDistrict === dist
                              ? "bg-forest border-forest"
                              : "bg-cream border-sand"
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-medium ${
                              newFarmDistrict === dist ? "text-white" : "text-ink"
                            }`}
                          >
                            {dist}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Land Size in Acres */}
                  <View>
                    <Text className="text-xs font-semibold text-textSecondary mb-1">
                      Land Size (Acres)
                    </Text>
                    <TextInput
                      className="bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-ink"
                      placeholder="e.g. 8.0"
                      keyboardType="numeric"
                      value={newFarmAcres}
                      onChangeText={setNewFarmAcres}
                    />
                  </View>

                  {/* Soil Type */}
                  <View>
                    <Text className="text-xs font-semibold text-textSecondary mb-1">
                      Soil Type
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="flex-row gap-1.5 py-1"
                    >
                      {COMMON_SOILS.map((soil) => (
                        <Pressable
                          key={soil}
                          onPress={() => setNewFarmSoil(soil)}
                          className={`px-2.5 py-1 rounded-full border ${
                            newFarmSoil === soil
                              ? "bg-forest border-forest"
                              : "bg-cream border-sand"
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-medium ${
                              newFarmSoil === soil ? "text-white" : "text-ink"
                            }`}
                          >
                            {soil}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Make Default Checkbox */}
                  <Pressable
                    onPress={() => setNewFarmDefault(!newFarmDefault)}
                    className="flex-row items-center gap-2 mt-1"
                  >
                    <View
                      className={`w-4 h-4 rounded border items-center justify-center ${
                        newFarmDefault ? "bg-forest border-forest" : "border-sand bg-cream"
                      }`}
                    >
                      {newFarmDefault && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text className="text-xs text-textSecondary">
                      Set as my Default Farm on home screen
                    </Text>
                  </Pressable>

                  {/* Save Button */}
                  <Pressable
                    onPress={handleCreateFarm}
                    disabled={!newFarmName.trim()}
                    className={`rounded-xl py-2.5 items-center justify-center mt-2 ${
                      newFarmName.trim() ? "bg-forest active:opacity-90" : "bg-sand"
                    }`}
                  >
                    <Text className="text-white font-bold text-xs">
                      Save & Switch to This Farm
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>

          {/* ── Modal Footer ── */}
          <View className="bg-sand/30 px-5 py-3 border-t border-sand flex-row items-center justify-between">
            <Text className="text-[11px] text-textMuted font-medium">
              Active: {activeFarm.name} ({activeFarm.district})
            </Text>
            <Pressable
              onPress={onClose}
              className="bg-forest px-4 py-1.5 rounded-full active:opacity-80"
            >
              <Text className="text-white font-bold text-xs">Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

