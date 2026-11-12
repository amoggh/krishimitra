import React from "react";
import {
  TextInput,
  View,
  Pressable,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Search, Mic, X } from "lucide-react-native";
import { colors, radii } from "@/theme/tokens";

export type SearchBarProps = TextInputProps & {
  variant?: "dark" | "light";
  onMicPress?: () => void;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search crops, mandis, advisory...",
  variant = "light",
  onMicPress,
  onClear,
  containerStyle,
  className = "",
  ...rest
}: SearchBarProps) {
  const isDark = variant === "dark";

  const containerBg = isDark
    ? "bg-white/15 border border-white/30 shadow-xs"
    : "bg-white border border-[#183B2B]/[0.10]";

  const placeholderColor = isDark
    ? "rgba(255, 255, 255, 0.65)"
    : colors.textSecondary;

  const iconColor = isDark ? colors.white : colors.textSecondary;

  const textColor = isDark ? "text-white" : "text-ink";

  return (
    <View
      className={`h-11 flex-row items-center rounded-full px-3.5 ${containerBg} ${className}`}
      style={[{ borderRadius: radii.full }, containerStyle]}
    >
      <Search size={16} color={iconColor} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        className={`mx-2.5 flex-1 font-sans text-xs ${textColor}`}
        style={{ paddingVertical: 0 }}
        {...rest}
      />

      {value && onClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          className="p-1 active:opacity-70"
        >
          <X size={14} color={iconColor} />
        </Pressable>
      ) : onMicPress ? (
        <Pressable
          onPress={onMicPress}
          accessibilityRole="button"
          accessibilityLabel="Voice search"
          className="p-1 active:opacity-70"
        >
          <Mic size={16} color={iconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default SearchBar;

