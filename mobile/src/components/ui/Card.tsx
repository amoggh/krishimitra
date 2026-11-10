import { View, type ViewProps } from "react-native";
import { colors, radii, shadows } from "@/theme/tokens";

export type CardVariant = "default" | "sage" | "forest" | "outlined" | "flat";

export type CardProps = ViewProps & {
  variant?: CardVariant;
  noPadding?: boolean;
  padded?: "none" | "sm" | "md" | "lg";
};

const VARIANT_STYLES: Record<CardVariant, { bg: string; border?: string }> = {
  default: {
    bg: "bg-white",
    border: "border border-[#183B2B]/[0.06]",
  },
  sage: {
    bg: "bg-sage",
    border: "border border-sage-dark/40",
  },
  forest: {
    bg: "bg-primary",
    border: "border border-primary-dark",
  },
  outlined: {
    bg: "bg-white",
    border: "border border-cream-muted",
  },
  flat: {
    bg: "bg-cream-dark",
    border: "border-0",
  },
};

const PADDING_STYLES = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  children,
  variant = "default",
  noPadding = false,
  padded = "md",
  className,
  style,
  ...rest
}: CardProps) {
  const variantConfig = VARIANT_STYLES[variant];
  const paddingClass = noPadding ? "p-0" : PADDING_STYLES[padded];
  const isForest = variant === "forest";

  return (
    <View
      className={`mb-3 overflow-hidden ${variantConfig.bg} ${variantConfig.border ?? ""} ${paddingClass} ${className ?? ""}`}
      style={[
        {
          borderRadius: radii.card,
          ...(isForest ? shadows.elevated : shadows.card),
          shadowColor: isForest ? colors.primaryDark : "#183B2B",
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Card;
