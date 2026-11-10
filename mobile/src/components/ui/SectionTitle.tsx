import type { ReactNode } from "react";
import { Text, View, type TextProps } from "react-native";

export type SectionTitleProps = TextProps & {
  children: ReactNode;
  subtitle?: string;
  className?: string;
};

export function SectionTitle({
  children,
  subtitle,
  className = "",
  ...rest
}: SectionTitleProps) {
  return (
    <View className="mb-2">
      <Text
        className={`font-sans-bold text-xs uppercase tracking-wider text-ink-muted ${className}`}
        {...rest}
      >
        {children}
      </Text>
      {subtitle && (
        <Text className="mt-0.5 font-sans text-xs text-ink-muted">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export default SectionTitle;
