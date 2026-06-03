import { Pressable, Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, GradientHeader, ScreenContainer, SectionTitle } from "@/components/ui";
import { mockDashboard } from "@/data/mockData";

type Props = MainTabScreenProps<"Profile">;

export function ProfileScreen({ navigation }: Props) {
  const farmer = mockDashboard.farmer;

  return (
    <View className="flex-1 bg-cream">
      <GradientHeader>
        <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-earth-soft">
          <Text className="font-sans-extrabold text-2xl text-white">RP</Text>
        </View>
        <Text className="font-sans-extrabold text-xl text-white">{farmer.name}</Text>
        <Text className="text-sm text-white/90">{farmer.phone}</Text>
        <Text className="text-xs text-white/75">
          {farmer.acres} acres · {farmer.location}
        </Text>
      </GradientHeader>
      <ScreenContainer safe={false} className="px-4">
        <SectionTitle>Farm history</SectionTitle>
        <Card>
          <Text className="font-sans-bold text-sm text-ink">Kharif 2025</Text>
          <Text className="text-xs text-ink-muted">Soybean 3 ac · Actual yield 21 q/ac</Text>
          <Text className="font-sans-semibold text-xs text-success">Within predicted range</Text>
        </Card>
        <Card>
          <Text className="font-sans-bold text-sm text-ink">Rabi 2024-25</Text>
          <Text className="text-xs text-ink-muted">Wheat 2.5 ac · Price ₹2,340/q received</Text>
        </Card>

        <SectionTitle>Saved plans</SectionTitle>
        <Card>
          <Text className="font-sans-bold text-sm text-ink">Kharif 2026 — Active</Text>
          <Text className="text-xs text-ink-muted">Soybean + Cotton · Saved 2 days ago</Text>
        </Card>
        <Card>
          <Text className="font-sans-bold text-sm text-ink">Kharif 2026 — Alt plan</Text>
          <Text className="text-xs text-ink-muted">Soybean only · Lower risk</Text>
        </Card>

        <Pressable
          className="mt-2 py-3"
          onPress={() => navigation.getParent()?.navigate("Settings")}
        >
          <Text className="text-center font-sans-semibold text-sm text-forest">
            Settings →
          </Text>
        </Pressable>
      </ScreenContainer>
    </View>
  );
}
