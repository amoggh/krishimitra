import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "@/theme/colors";

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

  function handleSelect(selectedValue: string) {
    onSelect(selectedValue);
    setModalVisible(false);
    setSearch("");
  }

  function handleClose() {
    setModalVisible(false);
    setSearch("");
  }

  return (
    <View className="mb-3.5">
      <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">
        {label}
      </Text>

      {/* Dropdown Field Trigger */}
      <Pressable
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
        className={`flex-row items-center justify-between rounded-xl border border-cream-dark bg-white px-3.5 py-3 active:bg-cream/40 ${className ?? ""}`}
      >
        <Text
          className={`font-sans text-base ${
            selectedOption ? "text-ink" : "text-ink-light"
          }`}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text className="ml-2 text-xs text-ink-light">▼</Text>
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
            className="max-h-[82%] w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="mb-3 flex-row items-center justify-between border-b border-cream-dark pb-3">
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
                className="h-8 w-8 items-center justify-center rounded-full bg-cream"
              >
                <Text className="font-sans-bold text-sm text-ink-muted">✕</Text>
              </Pressable>
            </View>

            {/* Search Input for Quick Filtering */}
            <View className="mb-3 flex-row items-center rounded-xl border border-cream-dark bg-cream/50 px-3 py-2">
              <Text className="mr-2 text-xs text-ink-light">🔍</Text>
              <TextInput
                className="flex-1 font-sans text-sm text-ink"
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.inkLight}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Text className="text-xs text-ink-light">✕</Text>
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
                    className={`flex-row items-center justify-between rounded-lg px-3 py-3 active:bg-cream ${
                      isSelected ? "bg-green-pale" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        isSelected
                          ? "font-sans-bold text-forest"
                          : "font-sans text-ink"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Text className="font-sans-bold text-sm text-forest">
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View className="h-[1px] bg-cream-dark/50" />
              )}
              ListEmptyComponent={() => (
                <View className="items-center py-8">
                  <Text className="font-sans text-sm text-ink-muted">
                    No results for "{search}"
                  </Text>
                </View>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
