import { Text, View } from "react-native";
import type { MainTabScreenProps } from "@/types/navigation";
import { Card, PrimaryButton, ScreenContainer, SectionTitle } from "@/components/ui";

type Props = MainTabScreenProps<"Plan">;

export function PlanHubScreen({ navigation }: Props) {
  const parent = navigation.getParent();

  return (
    <ScreenContainer>
      <Text className="mb-1 font-sans-extrabold text-2xl text-ink">Crop plan</Text>
      <Text className="mb-5 text-sm text-ink-muted">
        Get AI-optimized land division and crop recommendations
      </Text>
      <Card>
        <SectionTitle>How it works</SectionTitle>
        <Text className="text-sm leading-5 text-ink-muted">
          1. Enter farm details{"\n"}
          2. AI analyzes soil, water, weather & mandi data{"\n"}
          3. Receive crop plan with profit ranges & risk scores
        </Text>
      </Card>
      <View className="mt-4">
        <PrimaryButton
          label="Start new farm analysis"
          onPress={() => parent?.navigate("FarmInput")}
        />
      </View>
    </ScreenContainer>
  );
}
