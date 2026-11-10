import React from "react";
import { type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { AppButton, type ButtonVariant, type ButtonSize } from "./AppButton";

export type PrimaryButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "outline" | "secondary";
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading,
  disabled,
  fullWidth = true,
  className = "",
  style,
  ...rest
}: PrimaryButtonProps) {
  const mappedVariant: ButtonVariant =
    variant === "outline" ? "outline" : variant === "secondary" ? "secondary" : "primary";

  return (
    <AppButton
      label={label}
      variant={mappedVariant}
      size={size}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      className={className}
      style={style}
      {...rest}
    />
  );
}

export default PrimaryButton;
