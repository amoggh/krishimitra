import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackScreenProps } from "@/types/navigation";
import { BackButton, Card } from "@/components/ui";
import { colors } from "@/theme/colors";

type Props = RootStackScreenProps<"Settings">;

const LANGUAGES = ["English", "हिंदी", "मराठी", "ಕನ್ನಡ"];

export function SettingsScreen({ navigation }: Props) {
  const [lang, setLang] = useState("English");
  const [push, setPush] = useState(true);
  const [mandi, setMandi] = useState(true);
  const [weather, setWeather] = useState(true);
  const [harvest, setHarvest] = useState(false);
  const [dark, setDark] = useState(false);
  const [largeText, setLargeText] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center justify-between px-4 pb-3 pt-5">
        <View className="flex-row items-center gap-2">
          <BackButton />
          <Text className="font-sans-extrabold text-2xl text-ink">Settings</Text>
        </View>
        <Pressable
          onPress={() =>
            navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Main")
          }
        >
          <Text className="font-sans-semibold text-forest">Done</Text>
        </Pressable>
      </View>

      <View className="px-4">
        <Text className="mb-2 font-sans-bold text-xs uppercase text-ink-muted">Language</Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              className={`rounded-full px-3.5 py-2 ${lang === l ? "bg-forest" : "border border-cream-dark bg-white"}`}
            >
              <Text className={`font-sans-semibold text-sm ${lang === l ? "text-white" : "text-ink"}`}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card className="px-0 py-0">
          <ToggleRow label="Push notifications" value={push} onChange={setPush} />
          <ToggleRow label="Mandi price alerts" value={mandi} onChange={setMandi} />
          <ToggleRow label="Weather warnings" value={weather} onChange={setWeather} />
          <ToggleRow label="Harvest reminders" value={harvest} onChange={setHarvest} last />
        </Card>

        <Card className="mt-3 px-0 py-0">
          <ToggleRow label="Dark mode" value={dark} onChange={setDark} />
          <ToggleRow label="Large text (accessibility)" value={largeText} onChange={setLargeText} last />
        </Card>

        <Card className="mt-3">
          <Text className="font-sans-semibold text-sm text-ink">Help & support</Text>
          <Text className="text-xs text-ink-muted">Call agronomist helpline · FAQs · Report issue</Text>
        </Card>

        <Text className="mt-6 text-center text-xs text-ink-light">
          KrushiMitra v1.0 · Made for Indian farmers
        </Text>
      </View>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between px-3.5 py-3.5"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.creamDark }}
    >
      <Text className="font-sans-medium text-sm text-ink">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.creamDark, true: colors.greenLight }}
        thumbColor={value ? colors.forest : colors.white}
      />
    </View>
  );
}