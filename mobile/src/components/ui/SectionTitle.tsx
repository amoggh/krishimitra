import { Text } from "react-native";

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
      {children}
    </Text>
  );
}
