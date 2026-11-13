import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronDown, Search, X, Check } from "lucide-react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type SelectDropdownOption = {
  label: string;
  value: string;
};

export type SelectDropdownProps = {
  label: string;
  value?: string;
  options: readonly string[] | readonly SelectDropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
};

export function SelectDropdown({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
  className,
  searchPlaceholder = "Search district...",
}: SelectDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedOptions = useMemo<SelectDropdownOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q)
    );
  }, [normalizedOptions, search]);

  function handleSelect(val: string) {
    onSelect(val);
    setModalVisible(false);
    setSearch("");
  }

  function handleClose() {
    setModalVisible(false);
    setSearch("");
  }

  return (
    <View className="mb-3.5">
      <Text className="mb-1.5 font-sans-bold text-xs text-ink">{label}</Text>

      {/* Trigger Button */}
      <Pressable
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption ? selectedOption.label : placeholder}`}
        className={`flex-row items-center justify-between rounded-xl border border-[#183B2B]/[0.12] bg-white px-3.5 py-3 active:border-primary ${
          className ?? ""
        }`}
        style={{ borderRadius: radii.md }}
      >
        <Text
          className={`font-sans text-base ${
            selectedOption ? "text-ink font-sans-medium" : "text-ink-muted"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {/* Dropdown Modal Selection Dialog */}
      <Modal
        visible={modalVisible}
        transparent
        animationType={Platform.OS === "web" ? "none" : "fade"}
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-4"
          onPress={handleClose}
        >
          <Pressable
            className="max-h-[82%] w-full max-w-md bg-white p-4"
            style={[
              {
                borderRadius: radii.card,
                ...shadows.elevated,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="mb-3 flex-row items-center justify-between border-b border-cream-muted pb-3">
              <View>
                <Text className="font-sans-bold text-lg text-ink">
                  {label}
                </Text>
                <Text className="font-sans text-xs text-ink-muted">
                  {normalizedOptions.length} available
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                hitSlop={10}
                className="h-8 w-8 items-center justify-center rounded-full bg-cream active:bg-cream-dark"
              >
                <X size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Search Input for Quick Filtering */}
            <View className="mb-3 flex-row items-center rounded-xl border border-cream-muted bg-cream/60 px-3 py-2">
              <Search size={15} color={colors.textSecondary} className="mr-2" />
              <TextInput
                className="flex-1 font-sans text-sm text-ink ml-1.5"
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <X size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => handleSelect(item.value)}
                    className={`flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-cream ${
                      isSelected ? "bg-sage" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        isSelected
                          ? "font-sans-bold text-primary"
                          : "font-sans text-ink"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Check size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="py-8 items-center justify-center">
                  <Text className="text-center font-sans text-sm text-ink-muted">
                    No matches found for "{search}"
                  </Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default SelectDropdown;
