import React from "react";
import { View } from "react-native";
import { Sprout, ScanLine, TrendingUp, Bot } from "lucide-react-native";
import { QuickActionCard, type QuickActionItem } from "@/components/ui/QuickActionCard";
import { useResponsive } from "@/theme/responsive";
import { colors } from "@/theme/tokens";

export type HomeAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  emoji?: string;
  subtitle?: string;
  tone?: "sage" | "gold" | "white" | "primary";
  onPress?: () => void;
};

function getFallbackIcon(id: string, emoji?: string) {
  const iconColor = colors.primary;
  const size = 20;

  if (id === "plan" || (emoji && emoji.includes("🌾"))) {
    return <Sprout size={size} color={iconColor} />;
  }
  if (id === "scan" || (emoji && (emoji.includes("🔍") || emoji.includes("📷")))) {
    return <ScanLine size={size} color={iconColor} />;
  }
  if (id === "mandi" || (emoji && emoji.includes("📊"))) {
    return <TrendingUp size={size} color={iconColor} />;
  }
  return <Bot size={size} color={iconColor} />;
}

const defaultActions: HomeAction[] = [
  {
    id: "plan",
    label: "Crop Planning",
    subtitle: "AI land optimizer",
    tone: "sage",
  },
  {
    id: "scan",
    label: "Disease Detection",
    subtitle: "Instant leaf scan",
    tone: "gold",
  },
  {
    id: "mandi",
    label: "Mandi Prices",
    subtitle: "Live APMC rates",
    tone: "sage",
  },
  {
    id: "assistant",
    label: "Krishi AI",
    subtitle: "Smart farm advisor",
    tone: "white",
  },
];

type Props = {
  actions?: HomeAction[];
  columns?: 2 | 4;
  className?: string;
};

export function QuickActions({
  actions = defaultActions,
  columns,
  className = "",
}: Props) {
  const { isMobile } = useResponsive();
  const numColumns = columns ?? (isMobile ? 2 : 2);

  const mappedItems: QuickActionItem[] = actions.map((action, index) => {
    const tone =
      action.tone ?? (index === 0 ? "sage" : index === 1 ? "gold" : index === 2 ? "sage" : "white");
    return {
      id: action.id,
      label: action.label,
      subtitle: action.subtitle,
      icon: action.icon ?? getFallbackIcon(action.id, action.emoji),
      tone,
      onPress: action.onPress,
    };
  });

  if (numColumns === 2) {
    return (
      <View className={`mb-3.5 flex-row flex-wrap justify-between gap-y-2.5 ${className}`}>
        {mappedItems.map((item) => (
          <View key={item.id} style={{ width: "48.2%" }}>
            <QuickActionCard item={item} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className={`mb-3.5 flex-row items-stretch justify-between gap-2.5 ${className}`}>
      {mappedItems.map((item) => (
        <QuickActionCard key={item.id} item={item} />
      ))}
    </View>
  );
}

export default QuickActions;
