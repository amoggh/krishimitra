import React from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { radii, shadows } from "@/theme/tokens";

export type QuickActionItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  subtitle?: string;
  badge?: string;
  tone?: "sage" | "gold" | "white" | "primary";
  onPress?: () => void;
};

export type QuickActionCardProps = ViewProps & {
  item: QuickActionItem;
  className?: string;
};

const TONE_CONFIGS = {
  sage: {
    cardBg: "bg-white",
    iconBg: "bg-sage",
    border: "border border-[#183B2B]/[0.06]",
  },
  gold: {
    cardBg: "bg-white",
    iconBg: "bg-gold-light",
    border: "border border-[#183B2B]/[0.06]",
  },
  white: {
    cardBg: "bg-white",
    iconBg: "bg-cream-dark",
    border: "border border-[#183B2B]/[0.06]",
  },
  primary: {
    cardBg: "bg-primary",
    iconBg: "bg-primary-dark",
    border: "border border-primary-dark",
  },
};

export function QuickActionCard({ item, className = "", style, ...rest }: QuickActionCardProps) {
  const tone = item.tone ?? "sage";
  const config = TONE_CONFIGS[tone];
  const isPrimary = tone === "primary";

  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      className={`flex-1 items-center justify-center p-3 active:scale-[0.98] ${config.cardBg} ${config.border} ${className}`}
      style={[
        {
          borderRadius: radii.card,
          ...shadows.subtle,
        },
        style,
      ]}
      {...rest}
    >
      {item.badge && (
        <View className="absolute right-2 top-2 rounded-full bg-gold px-1.5 py-0.5">
          <Text className="font-sans-bold text-[9px] text-ink">{item.badge}</Text>
        </View>
      )}

      {/* Icon squircle */}
      <View
        className={`mb-2 h-11 w-11 items-center justify-center rounded-2xl ${config.iconBg}`}
      >
        {item.icon}
      </View>

      {/* Label */}
      <Text
        className={`text-center font-sans-bold text-xs tracking-tight ${
          isPrimary ? "text-white" : "text-ink"
        }`}
        numberOfLines={1}
      >
        {item.label}
      </Text>

      {item.subtitle && (
        <Text
          className={`mt-0.5 text-center font-sans text-[10px] ${
            isPrimary ? "text-white/75" : "text-ink-muted"
          }`}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>
      )}
    </Pressable>
  );
}

export function QuickActionsRow({
  actions,
  className = "",
}: {
  actions: QuickActionItem[];
  className?: string;
}) {
  return (
    <View className={`mb-3.5 flex-row items-stretch justify-between gap-2.5 ${className}`}>
      {actions.map((action) => (
        <QuickActionCard key={action.id} item={action} />
      ))}
    </View>
  );
}

export default QuickActionCard;

