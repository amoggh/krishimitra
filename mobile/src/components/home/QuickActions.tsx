import { Pressable, Text, View } from "react-native";

type Action = { id: string; label: string; emoji: string; onPress?: () => void };

const defaultActions: Action[] = [
  { id: "plan", label: "New Plan", emoji: "🌾" },
  { id: "scan", label: "Scan Leaf", emoji: "🔍" },
  { id: "mandi", label: "Mandi", emoji: "📊" },
  { id: "help", label: "Help", emoji: "❓" },
];

type Props = { actions?: Action[] };

export function QuickActions({ actions = defaultActions }: Props) {
  return (
    <View className="mb-3.5 flex-row justify-between gap-2">
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={action.onPress}
          className="flex-1 items-center rounded-xl bg-white p-2.5 shadow-sm"
          style={{ elevation: 2 }}
        >
          <View className="mb-1.5 h-8 w-8 items-center justify-center rounded-lg bg-green-pale">
            <Text>{action.emoji}</Text>
          </View>
          <Text className="text-center font-sans-semibold text-[9px] text-ink-muted">
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
