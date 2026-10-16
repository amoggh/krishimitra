import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackScreenProps } from "@/types/navigation";
import { BackButton, Chip, FormInput, PrimaryButton, SelectDropdown } from "@/components/ui";
import { KARNATAKA_DISTRICTS } from "@/constants/districts";
import type { FarmInputPayload, SoilInput } from "@/types/api";

type Props = RootStackScreenProps<"FarmInput">;

const HP_OPTIONS = [1, 2, 3, 5, 7.5, 10] as const;
const IRRIGATION = ["flood", "furrow", "sprinkler", "drip"] as const;
const SEASONS = ["kharif", "rabi", "zaid", "summer"] as const;

type IrrigationType = typeof IRRIGATION[number];
type SeasonType = typeof SEASONS[number];

export function FarmInputScreen({ navigation }: Props) {
  // Core fields
  const [area, setArea] = useState("5.0");
  const [district, setDistrict] = useState("Mandya");
  const [pincode, setPincode] = useState("");
  const [budget, setBudget] = useState("150000");
  const [motorHp, setMotorHp] = useState<number>(5);
  const [hours, setHours] = useState("6");
  const [irrigation, setIrrigation] = useState<IrrigationType>("drip");
  const [borewell, setBorewell] = useState("300");
  const [season, setSeason] = useState<SeasonType>("kharif");

  // Optional soil fields
  const [showSoil, setShowSoil] = useState(false);
  const [soilPh, setSoilPh] = useState("6.5");
  const [soilTexture, setSoilTexture] = useState("loamy");

  function handleSubmit() {
    const soil: SoilInput | undefined = showSoil
      ? {
          ph: parseFloat(soilPh) || undefined,
          texture: soilTexture.trim() || undefined,
        }
      : undefined;

    const payload: FarmInputPayload = {
      area_acres: parseFloat(area) || 1,
      district: district.trim(),
      pincode: pincode.trim() || undefined,
      investment_inr: parseInt(budget, 10) || 0,
      motor_hp: motorHp,
      daily_electricity_hours: parseFloat(hours) || 0,
      irrigation_type: irrigation,
      borewell_depth_ft: borewell ? parseInt(borewell, 10) : undefined,
      season,
      soil,
    };
    navigation.navigate("AIProcessing", { farmInput: payload });
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
        <BackButton className="mb-3" />
        <Text className="font-sans-bold text-xs uppercase text-green">Step 1 of 2</Text>
        <Text className="font-sans-extrabold text-2xl text-ink">Your farm details</Text>
        <Text className="mb-5 text-sm text-ink-muted">
          Accurate inputs = better recommendations
        </Text>

        {/* Area */}
        <FormInput
          label="Total area (acres)"
          value={area}
          onChangeText={setArea}
          keyboardType="decimal-pad"
        />

        {/* District */}
        <SelectDropdown
          label="District (Karnataka)"
          value={district}
          options={KARNATAKA_DISTRICTS}
          onSelect={setDistrict}
          placeholder="Select district"
          searchPlaceholder="Search district (e.g. Mandya, Mysuru)..."
        />

        {/* Pincode — optional */}
        <FormInput
          label="Pincode — optional"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
          placeholder="6-digit pincode"
        />

        {/* Budget */}
        <FormInput
          label="Investment budget (INR)"
          value={budget}
          onChangeText={setBudget}
          keyboardType="number-pad"
        />

        {/* Season */}
        <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">Season</Text>
        <View className="mb-3.5 flex-row flex-wrap gap-2">
          {SEASONS.map((s) => (
            <Chip
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={season === s}
              onPress={() => setSeason(s)}
            />
          ))}
        </View>

        {/* Motor HP */}
        <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">Motor HP</Text>
        <View className="mb-3.5 flex-row flex-wrap gap-2">
          {HP_OPTIONS.map((hp) => (
            <Chip
              key={hp}
              label={`${hp} HP`}
              selected={motorHp === hp}
              onPress={() => setMotorHp(hp)}
            />
          ))}
        </View>

        {/* Electricity hours */}
        <FormInput
          label="Daily electricity hours"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
        />

        {/* Irrigation */}
        <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">
          Irrigation type
        </Text>
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

        {/* Borewell depth */}
        <FormInput
          label="Borewell depth (ft) — optional"
          value={borewell}
          onChangeText={setBorewell}
          keyboardType="number-pad"
          placeholder="Improves water estimate accuracy"
        />

        {/* Optional soil section */}
        <Text
          className="mb-3 font-sans-semibold text-xs text-forest"
          onPress={() => setShowSoil((v) => !v)}
        >
          {showSoil ? "▾ Hide soil details" : "▸ Add soil details (optional)"}
        </Text>

        {showSoil && (
          <View className="mb-3 rounded-xl border border-cream-dark bg-white p-3">
            <Text className="mb-2 font-sans-bold text-xs uppercase text-ink-light">
              Soil info (from soil test)
            </Text>
            <FormInput
              label="Soil pH"
              value={soilPh}
              onChangeText={setSoilPh}
              keyboardType="decimal-pad"
              placeholder="e.g. 6.5"
            />
            <FormInput
              label="Soil texture / type"
              value={soilTexture}
              onChangeText={setSoilTexture}
              placeholder="e.g. loamy, clayey, red, black"
            />
          </View>
        )}

        <PrimaryButton label="Analyze my farm →" onPress={handleSubmit} />
      </ScrollView>
    </SafeAreaView>
  );
}
