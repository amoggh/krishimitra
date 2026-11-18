import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { RootStackScreenProps } from "@/types/navigation";
import { BackButton, Card, PrimaryButton, ScreenContainer, SectionTitle } from "@/components/ui";
import { colors } from "@/theme/colors";
import {
  analyzeDisease,
  type DiseaseResult,
} from "@/services/api/diseaseService";
import { SYMPTOMS, DISEASES, type DiseaseInfo, type SymptomTag } from "@/data/diseasesData";
import { CROPS } from "@/data/cropsData";
import { Check, ShieldAlert, Sparkles, Filter, Leaf } from "lucide-react-native";

type Props = RootStackScreenProps<"DiseaseDetection">;

export function DiseaseDetectionScreen({ route, navigation }: Props) {
  const [activeMode, setActiveMode] = useState<"camera" | "symptoms">("camera");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(
    route.params?.imageUri ?? null
  );
  const [selectedImageType, setSelectedImageType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing leaf...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);

  // Symptom checker state
  const [selectedCrop, setSelectedCrop] = useState<string>("all");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["spots"]);

  const state = route.params?.state?.trim() || "Karnataka";
  const district = route.params?.district?.trim() || "Haveri";

  const openExternalLink = async (url: string | null) => {
    if (!url) return;
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.warn("Unable to open external link", error);
      Alert.alert("Unable to open link", "Could not open the product page on your browser.");
    }
  };

  const selectImage = async (useCamera: boolean) => {
    try {
      const picker = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.9,
          });

      if (picker.canceled || !picker.assets[0]) {
        return;
      }

      const asset = picker.assets[0];
      setSelectedImageUri(asset.uri);
      setSelectedImageType(asset.mimeType || "image/jpeg");
      setResult(null);
      setErrorMessage(null);
    } catch (error) {
      console.warn("Unable to select disease image", error);
      setErrorMessage("Unable to open the camera/gallery. Please check permissions and try again.");
    }
  };

  const detectDisease = async () => {
    if (!selectedImageUri) {
      setErrorMessage("Please capture or choose a clear leaf photo to continue.");
      return;
    }

    setLoading(true);
    setLoadingMessage("Analyzing crop leaf...");
    setErrorMessage(null);

    const loadingTimer = setTimeout(() => {
      setLoadingMessage("Fetching verified remedies & live prices...");
    }, 1600);

    try {
      const response = await analyzeDisease(
        selectedImageUri,
        selectedImageType,
        state,
        district
      );
      setResult(response);
    } catch (error) {
      console.warn("Disease detection request failed", error);
      const msg = error instanceof Error ? error.message : "Network error";
      setErrorMessage(
        msg.includes("Failed to connect") || msg.includes("Network")
          ? "Cannot connect to Krishimitra AI backend. Switch to Symptom Checker below for instant diagnosis!"
          : `Diagnosis failed: ${msg}`
      );
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  };

  const toggleSymptom = (symId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symId) ? prev.filter((s) => s !== symId) : [...prev, symId]
    );
  };

  // Rank diseases based on crop filter and selected symptoms
  const rankedDiseases = useMemo(() => {
    const pool = DISEASES.filter(
      (d) => selectedCrop === "all" || d.crop.includes(selectedCrop)
    );

    return pool
      .map((d) => {
        const matches = d.tags.filter((t) => selectedSymptoms.includes(t)).length;
        const score =
          selectedSymptoms.length > 0
            ? (matches / Math.max(d.tags.length, 1)) * 0.6 +
              (matches / selectedSymptoms.length) * 0.4
            : 0.1;
        return { disease: d, score, matches };
      })
      .filter((item) => selectedSymptoms.length === 0 || item.matches > 0)
      .sort((a, b) => b.score - a.score);
  }, [selectedCrop, selectedSymptoms]);

  const resetAll = () => {
    setSelectedImageUri(null);
    setResult(null);
    setErrorMessage(null);
  };

  const confidencePct = result?.prediction?.confidence
    ? (result.prediction.confidence * 100).toFixed(1)
    : "0";

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32"
      >
        {/* Navigation & Header */}
        <View className="mb-4">
          <BackButton />
        </View>

        <View className="mb-4">
          <Text className="font-sans-extrabold text-2xl text-ink">
            Crop Disease Detection & Doctor
          </Text>
          <Text className="text-xs font-sans-medium text-ink-muted mt-0.5">
            Neural vision diagnosis, visual symptom checklist & organic and chemical remedy doses
          </Text>
        </View>

        {/* Location Badge */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="rounded-full bg-secondary px-3 py-1 border border-border">
            <Text className="text-xs font-sans-bold text-forest">
              📍 {district}, {state}
            </Text>
          </View>
        </View>

        {/* Mode Selector Tabs */}
        <View className="mb-4 flex-row gap-2 border-b border-borderSubtle pb-2">
          <Pressable
            onPress={() => setActiveMode("camera")}
            className={`flex-1 rounded-full py-2 items-center border transition-all ${
              activeMode === "camera"
                ? "bg-primary border-primary shadow-xs"
                : "bg-white border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                activeMode === "camera" ? "text-white" : "text-ink"
              }`}
            >
              📷 AI Camera Vision
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveMode("symptoms")}
            className={`flex-1 rounded-full py-2 items-center border transition-all ${
              activeMode === "symptoms"
                ? "bg-primary border-primary shadow-xs"
                : "bg-white border-borderSubtle"
            }`}
          >
            <Text
              className={`font-sans-bold text-xs ${
                activeMode === "symptoms" ? "text-white" : "text-ink"
              }`}
            >
              🔬 Visual Symptom Checker
            </Text>
          </Pressable>
        </View>

        {/* ============================================================== */}
        {/* MODE 1: CAMERA VISION                                          */}
        {/* ============================================================== */}
        {activeMode === "camera" && (
          <View>
            {/* Selected Image Preview */}
            {selectedImageUri && (
              <View className="mb-4 rounded-2xl overflow-hidden bg-black/5 border border-border shadow-sm">
                <Image
                  source={{ uri: selectedImageUri }}
                  className="w-full h-64"
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Action Buttons to Select Photo */}
            {!loading && (
              <View className="flex-row gap-3 mb-4">
                <Pressable
                  onPress={() => void selectImage(true)}
                  className="flex-1 rounded-xl bg-forest py-3.5 items-center justify-center shadow-sm active:opacity-90"
                >
                  <Text className="font-sans-bold text-sm text-white">📷 Take Photo</Text>
                </Pressable>
                <Pressable
                  onPress={() => void selectImage(false)}
                  className="flex-1 rounded-xl bg-white border border-forest py-3.5 items-center justify-center shadow-sm active:bg-secondary/40"
                >
                  <Text className="font-sans-bold text-sm text-forest">🖼️ Gallery</Text>
                </Pressable>
              </View>
            )}

            {/* Analyze Button */}
            {!result && !loading && selectedImageUri && (
              <View className="mb-4">
                <PrimaryButton
                  label="Detect Crop Disease"
                  onPress={detectDisease}
                />
              </View>
            )}

            {/* Loading Indicator */}
            {loading && (
              <Card className="items-center justify-center py-8 mb-4">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-3 text-sm font-sans-bold text-forest">
                  {loadingMessage}
                </Text>
                <Text className="mt-1 text-xs text-ink-muted">
                  Running MobileNetV2 leaf classifier & CIBRC database queries
                </Text>
              </Card>
            )}

            {/* Error Card */}
            {errorMessage && (
              <View className="rounded-2xl bg-danger-bg p-4 border border-danger-border mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                  <Text className="font-sans-bold text-sm text-danger">Diagnosis Alert</Text>
                </View>
                <Text className="text-xs font-sans-medium text-danger leading-5">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Primary AI Diagnosis Result */}
            {result && (
              <>
                <Card className="mb-4">
                  <View className="flex-row items-center justify-between mb-3 border-b border-border pb-3">
                    <View className="flex-row items-center gap-2">
                      <Text style={{ fontSize: 20 }}>
                        {result.prediction.is_healthy ? "✅" : "🔬"}
                      </Text>
                      <Text className="font-sans-extrabold text-base text-ink">
                        {result.prediction.is_healthy ? "Crop Status" : "Disease Diagnosis"}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-0.5 border ${
                        result.prediction.is_healthy
                          ? "bg-success-bg border-success-border"
                          : "bg-danger-bg border-danger-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-sans-bold ${
                          result.prediction.is_healthy ? "text-success" : "text-danger"
                        }`}
                      >
                        {result.prediction.is_healthy ? "Healthy" : "Infected"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-sans-medium text-ink-muted">Identified Crop</Text>
                      <Text className="font-sans-bold text-lg text-ink">
                        {result.prediction.crop || "Unknown"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-sans-medium text-ink-muted">Model Confidence</Text>
                      <Text className="font-sans-extrabold text-lg text-forest">
                        {confidencePct}%
                      </Text>
                    </View>
                  </View>

                  <View className="mb-2">
                    <Text className="text-xs font-sans-medium text-ink-muted">Diagnosed Condition</Text>
                    <Text className="font-sans-extrabold text-xl text-ink mt-0.5">
                      {result.prediction.condition}
                    </Text>
                  </View>
                </Card>

                {/* Healthy Status */}
                {result.prediction.is_healthy && (
                  <View className="rounded-2xl bg-success-bg p-4 border border-success-border mb-4">
                    <Text className="font-sans-bold text-sm text-success mb-1">
                      🌱 Healthy Crop Confirmed
                    </Text>
                    <Text className="text-xs text-ink">
                      No visual pathogens or blights were detected. Maintain weekly scouting and balanced irrigation.
                    </Text>
                  </View>
                )}

                {/* Verified Pesticides */}
                {!result.prediction.is_healthy && result.pesticides?.length > 0 && (
                  <Card className="mb-4">
                    <SectionTitle>Verified Pesticide Recommendations</SectionTitle>
                    <Text className="text-xs text-ink-muted mb-3">
                      Scientifically validated treatments based on CIBRC registries
                    </Text>

                    {result.pesticides.map((pesticide, index) => (
                      <View
                        key={`${pesticide.active_ingredient}-${index}`}
                        className="rounded-xl border border-border bg-white p-3.5 mb-3 last:mb-0 shadow-xs"
                      >
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text className="font-sans-bold text-sm text-ink">
                            {pesticide.product_type}
                          </Text>
                          <View className="rounded-full bg-secondary px-2 py-0.5">
                            <Text className="text-2xs font-sans-bold text-forest">
                              {pesticide.recommendation_status}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-xs font-sans-semibold text-ink leading-5">
                          Active Ingredient:{" "}
                          <Text className="font-sans-bold text-forest">
                            {pesticide.active_ingredient}
                          </Text>
                        </Text>

                        {pesticide.formulation && (
                          <Text className="text-xs text-ink-muted mt-0.5">
                            Formulation: {pesticide.formulation}
                          </Text>
                        )}

                        {pesticide.source_url && (
                          <Pressable
                            onPress={() => void openExternalLink(pesticide.source_url)}
                            className="mt-2.5 flex-row items-center gap-1"
                          >
                            <Text className="text-xs font-sans-bold text-forest underline">
                              View Official Reference Document →
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </Card>
                )}

                {/* Reset Button */}
                <View className="mt-2 mb-6">
                  <Pressable
                    onPress={resetAll}
                    className="rounded-xl border border-forest py-3.5 items-center justify-center bg-white shadow-xs active:bg-secondary/40"
                  >
                    <Text className="font-sans-bold text-sm text-forest">
                      🔄 Analyze Another Leaf
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* MODE 2: VISUAL SYMPTOM CHECKER & RANKING                      */}
        {/* ============================================================== */}
        {activeMode === "symptoms" && (
          <View>
            {/* Crop Selector */}
            <View className="mb-4">
              <Text className="mb-2 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
                1. Select Crop
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-1.5">
                <Pressable
                  onPress={() => setSelectedCrop("all")}
                  className={`rounded-full px-3 py-1 border ${
                    selectedCrop === "all" ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                  }`}
                >
                  <Text className={`font-sans-bold text-xs ${selectedCrop === "all" ? "text-white" : "text-ink"}`}>
                    All Crops
                  </Text>
                </Pressable>
                {CROPS.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCrop(c.id)}
                    className={`rounded-full px-3 py-1 border ${
                      selectedCrop === c.id ? "bg-primary border-primary" : "bg-white border-borderSubtle"
                    }`}
                  >
                    <Text className={`font-sans-bold text-xs ${selectedCrop === c.id ? "text-white" : "text-ink"}`}>
                      {c.name.split(" (")[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Symptom Tag Pills */}
            <View className="mb-4">
              <Text className="mb-2 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
                2. Tap Observed Symptoms on Leaf / Plant
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {SYMPTOMS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym.id);
                  return (
                    <Pressable
                      key={sym.id}
                      onPress={() => toggleSymptom(sym.id)}
                      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border transition-all ${
                        isChecked
                          ? "bg-primary border-primary shadow-xs"
                          : "bg-cream border-borderSubtle"
                      }`}
                    >
                      {isChecked && <Check size={12} color={colors.white} strokeWidth={2.5} />}
                      <Text
                        className={`font-sans-bold text-xs ${
                          isChecked ? "text-white" : "text-ink"
                        }`}
                      >
                        {sym.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Diagnostic Matches */}
            <Text className="mb-2 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
              Matching Diagnoses ({rankedDiseases.length} Found)
            </Text>

            <View className="gap-3">
              {rankedDiseases.slice(0, 4).map(({ disease: d }) => (
                <View
                  key={d.id}
                  className="rounded-2xl bg-white p-4 border border-primary/20 shadow-xs"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View>
                      <View className="flex-row items-center gap-2">
                        <Text className="font-sans-extrabold text-base text-ink">
                          {d.name}
                        </Text>
                        <Text className="font-sans text-xs text-primary font-bold">
                          {d.kn}
                        </Text>
                      </View>
                      <Text className="font-sans text-[11px] text-ink-muted">
                        Type: {d.kind} · Affected: {d.crop.join(", ")}
                      </Text>
                    </View>

                    {/* Severity Dots */}
                    <View className="items-end">
                      <Text className="font-sans text-[10px] text-ink-muted">Severity</Text>
                      <View className="flex-row gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <View
                            key={dot}
                            className={`h-2 w-2 rounded-full ${
                              dot <= d.severity ? "bg-red-500" : "bg-stone-200"
                            }`}
                          />
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Identification Appearance */}
                  <Text className="font-sans text-xs leading-4.5 text-ink-muted mb-2">
                    <Text className="font-sans-bold text-ink">Appearance: </Text>
                    {d.look}
                  </Text>

                  {/* Organic Remedies */}
                  <View className="rounded-xl bg-sage/60 p-2.5 border border-sage-dark/40 mb-2">
                    <Text className="font-sans-bold text-[11px] text-primary mb-1">
                      🌿 Organic & Biological Solutions:
                    </Text>
                    {d.organic.map((org, idx) => (
                      <Text key={idx} className="font-sans text-[11px] text-ink leading-4">
                        • {org}
                      </Text>
                    ))}
                  </View>

                  {/* Chemical Treatments */}
                  <View className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 mb-2">
                    <Text className="font-sans-bold text-[11px] text-amber-900 mb-1">
                      🧪 Chemical Spray Regimen (Follow Label Doses):
                    </Text>
                    {d.chem.map((chm, idx) => (
                      <Text key={idx} className="font-sans text-[11px] text-amber-950 leading-4">
                        • {chm}
                      </Text>
                    ))}
                  </View>

                  {/* Prevention */}
                  <Text className="font-sans text-[11px] text-ink-muted">
                    <Text className="font-sans-bold text-ink">Prevention: </Text>
                    {d.prevent}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default DiseaseDetectionScreen;
