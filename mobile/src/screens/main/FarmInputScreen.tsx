import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackScreenProps } from "@/types/navigation";
import { Chip, FormInput, PrimaryButton } from "@/components/ui";
import type { FarmInputPayload } from "@/types/api";

type Props = RootStackScreenProps<"FarmInput">;

const HP_OPTIONS = [1, 2, 3, 5, 7.5, 10];
const IRRIGATION = ["flood", "sprinkler", "drip"] as const;

export function FarmInputScreen({ navigation }: Props) {
  const [area, setArea] = useState("4.5");
  const [location, setLocation] = useState("Baramati, Pune · 413102");
  const [budget, setBudget] = useState("150000");
  const [motorHp, setMotorHp] = useState(5);
  const [hours, setHours] = useState("8");
  const [irrigation, setIrrigation] = useState<typeof IRRIGATION[number]>("drip");
  const [borewell, setBorewell] = useState("120");

  function handleSubmit() {
    const payload: FarmInputPayload = {
      area_acres: parseFloat(area),
      location,
      investment_inr: parseInt(budget, 10),
      motor_hp: motorHp,
      electricity_hours: parseInt(hours, 10),
      irrigation_type: irrigation,
      borewell_depth_ft: parseInt(borewell, 10),
      latitude: 18.15,
      longitude: 74.58,
    };
    navigation.navigate("AIProcessing", { farmInput: payload });
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
        <Text className="font-sans-bold text-xs uppercase text-green">Step 1 of 2</Text>
        <Text className="font-sans-extrabold text-2xl text-ink">Your farm details</Text>
        <Text className="mb-5 text-sm text-ink-muted">Accurate inputs = better recommendations</Text>

        <FormInput label="Total area (acres)" value={area} onChangeText={setArea} keyboardType="decimal-pad" />
        <FormInput label="Location (district / pincode)" value={location} onChangeText={setLocation} />
        <FormInput label="Investment budget (INR)" value={budget} onChangeText={setBudget} keyboardType="number-pad" />

        <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">Motor HP</Text>
        <View className="mb-3.5 flex-row flex-wrap gap-2">
          {HP_OPTIONS.map((hp) => (
            <Chip key={hp} label={`${hp} HP`} selected={motorHp === hp} onPress={() => setMotorHp(hp)} />
          ))}
        </View>

        <FormInput label="Daily electricity hours" value={hours} onChangeText={setHours} keyboardType="number-pad" />

        <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">Irrigation type</Text>
        <View className="mb-3.5 flex-row flex-wrap gap-2">
          {IRRIGATION.map((type) => (
            <Chip
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              selected={irrigation === type}
              onPress={() => setIrrigation(type)}
            />
          ))}
        </View>

        <FormInput
          label="Borewell depth (ft) — optional"
          value={borewell}
          onChangeText={setBorewell}
          keyboardType="number-pad"
          placeholder="Improves water accuracy"
        />

        <PrimaryButton label="Analyze my farm" onPress={handleSubmit} />
      </ScrollView>
    </SafeAreaView>
  );
}
