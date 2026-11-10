import React, { useState } from "react";
import { Text, TextInput, View, type TextInputProps, type ViewStyle, type StyleProp } from "react-native";
import { colors, radii } from "@/theme/tokens";

export type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;
};

export function FormInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  className = "",
  style,
  onFocus,
  onBlur,
  ...rest
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-3.5" style={containerStyle}>
      <Text className="mb-1.5 font-sans-bold text-xs text-ink">
        {label}
      </Text>

      <View
        className={`flex-row items-center rounded-xl bg-white px-3.5 ${
          error
            ? "border-2 border-danger"
            : isFocused
            ? "border-2 border-primary"
            : "border border-[#183B2B]/[0.12]"
        }`}
        style={{ borderRadius: radii.md }}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}

        <TextInput
          className={`flex-1 py-3 font-sans text-base text-ink ${className}`}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={style}
          {...rest}
        />

        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>

      {error ? (
        <Text className="mt-1 font-sans text-xs text-danger">{error}</Text>
      ) : helperText ? (
        <Text className="mt-1 font-sans text-xs text-ink-muted">{helperText}</Text>
      ) : null}
    </View>
  );
}

export default FormInput;
