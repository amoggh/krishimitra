import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
} from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import { BackButton, PrimaryButton, ScreenContainer } from "@/components/ui";
import { colors } from "@/theme/colors";
import { analyzeDisease, type DiseaseResult } from "@/services/api/diseaseService";
import { FertilizerRecommendationCard } from "@/components/fertilizer/FertilizerRecommendationCard";

type Props = NativeStackScreenProps<RootStackParamList, "DiseaseDetection">;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidencePct(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("failed to connect") ||
    msg.includes("failed to fetch")
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultCard({ result }: { result: DiseaseResult }) {
  const [showNutrientPlan, setShowNutrientPlan] = useState(false);

  // ---- Biological Foliage Gatekeeper (Invalid / Non-Leaf Image) ----
  if (!result.success || result.error_type === "invalid_image" || !result.prediction) {
    return (
      <View className="mt-6 rounded-2xl bg-white p-5 border border-amber-300 shadow-sm">
        <View className="flex-row items-center gap-2 mb-2">
          <Text style={{ fontSize: 24 }}>🍃</Text>
          <Text className="font-sans-extrabold text-lg text-amber-800">
            Invalid Leaf Photo
          </Text>
        </View>

        <Text className="text-sm font-sans-medium text-ink mb-3 leading-5">
          {result.message || "No crop leaf detected. Please upload a clear photo of a plant leaf."}
        </Text>

        <View className="rounded-xl bg-amber-50 p-3.5 border border-amber-200">
          <Text className="font-sans-bold text-xs text-amber-900 mb-1.5">
            How to take an accurate leaf photo:
          </Text>
          <Text className="text-xs text-amber-800 leading-5">
            • Focus closely on the affected crop leaf in good daylight.{"\n"}
            • Ensure the leaf fills at least half of the camera view.{"\n"}
            • Do not upload photos of people, animals, vehicles, or room objects.
          </Text>
        </View>
      </View>
    );
  }

  const { prediction } = result;
  const isUncertain = prediction.status === "uncertain";
  const isHealthy = prediction.is_healthy === true;

  const headerColor = isUncertain
    ? colors.warning
    : isHealthy
    ? colors.success
    : colors.danger;

  const headerIcon = isUncertain ? "⚠️" : isHealthy ? "✅" : "🔴";
  const headerLabel = isUncertain
    ? "Uncertain"
    : isHealthy
    ? "Healthy Leaf"
    : "Disease Detected";

  return (
    <View className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <Text style={{ fontSize: 22 }}>{headerIcon}</Text>
        <Text
          className="font-sans-extrabold text-lg"
          style={{ color: headerColor }}
        >
          {headerLabel}
        </Text>
      </View>

      {isUncertain ? (
        <View className="rounded-xl bg-amber-50/70 p-4 border border-amber-200/80">
          <Text className="text-sm font-sans-bold text-amber-900 mb-1">
            Diagnosis Uncertain {prediction.confidence > 0 ? `(${confidencePct(prediction.confidence)} confidence)` : ""}
          </Text>
          <Text className="text-xs text-amber-800 leading-4 mb-3">
            Plant foliage was verified, but the specific disease pattern or crop variety could not be confirmed with high statistical certainty.
          </Text>

          {/* Top Candidates if available */}
          {prediction.candidates && prediction.candidates.length > 0 && (
            <View className="mb-3 rounded-lg bg-white p-3 border border-amber-100">
              <Text className="font-sans-bold text-[11px] uppercase tracking-wider text-ink-muted mb-2">
                Closest Pattern Matches
              </Text>
              {prediction.candidates.map((cand, idx) => (
                <View key={idx} className="flex-row items-center justify-between py-1 border-b border-cream-muted/50 last:border-b-0">
                  <Text className="font-sans-medium text-xs text-ink">
                    {cand.crop} · <Text className="font-sans-semibold text-ink">{cand.condition}</Text>
                  </Text>
                  <Text className="font-sans-bold text-xs text-amber-800">
                    {confidencePct(cand.confidence)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Shooting Guidance Tips */}
          <View className="rounded-lg bg-white p-3 border border-amber-100">
            <Text className="font-sans-bold text-[11px] uppercase tracking-wider text-amber-900 mb-1.5">
              Field Photo Tips for Re-scan
            </Text>
            {(prediction.shooting_guidance || [
              "Hold camera 10–15 cm from the affected leaf spot.",
              "Ensure bright daylight and avoid heavy cast shadows.",
              "Place your hand or paper behind the leaf to isolate background soil and weeds.",
              "If scanning local field crops (Ragi, Cotton), consult Krishi AI Assistant.",
            ]).map((tip, idx) => (
              <Text key={idx} className="text-xs text-ink-muted leading-4 mb-1">
                • {tip}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <>
          {/* Main result */}
          <View
            className="rounded-xl p-4 mb-3"
            style={{
              backgroundColor: isHealthy
                ? colors.greenPale
                : "#fdecea",
            }}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-xs text-ink-muted uppercase tracking-wide mb-0.5">
                  Crop
                </Text>
                <Text className="font-sans-extrabold text-xl text-ink">
                  {prediction.crop}
                </Text>
              </View>
              {/* Confidence badge */}
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: headerColor }}
              >
                <Text className="font-sans-bold text-xs text-white">
                  {confidencePct(prediction.confidence)}
                </Text>
              </View>
            </View>

            <View className="mt-3">
              <Text className="text-xs text-ink-muted uppercase tracking-wide mb-0.5">
                Condition
              </Text>
              <Text className="font-sans-bold text-base text-ink">
                {prediction.condition}
              </Text>
            </View>
          </View>

          {/* Meta row */}
          <View className="flex-row gap-2 mb-4">
            <View className="flex-1 rounded-lg bg-cream p-3">
              <Text className="text-xs text-ink-muted mb-0.5">Health Status</Text>
              <Text
                className="font-sans-bold text-sm"
                style={{ color: headerColor }}
              >
                {isHealthy ? "Healthy Foliage" : "Infection Detected"}
              </Text>
            </View>
            <View className="flex-1 rounded-lg bg-cream p-3">
              <Text className="text-xs text-ink-muted mb-0.5">Confidence</Text>
              <Text className="font-sans-bold text-sm text-ink">
                {confidencePct(prediction.confidence)}
              </Text>
            </View>
          </View>

          {/* Farmer-Friendly Treatment & Spray Plan */}
          {prediction.treatment && (
            <View className="rounded-xl bg-sage/40 p-4 border border-sage-dark/30">
              <Text className="font-sans-extrabold text-xs uppercase tracking-wider text-primary mb-2.5">
                {isHealthy ? "🌱 Crop Health Advisory" : "💊 Treatment & Spray Recommendation"}
              </Text>

              {prediction.treatment.chemical ? (
                <View className="mb-2.5">
                  <Text className="font-sans-bold text-xs text-ink">
                    Chemical Spray & Dose:
                  </Text>
                  <Text className="font-sans text-xs text-ink-muted leading-4 mt-0.5">
                    {prediction.treatment.chemical}
                  </Text>
                </View>
              ) : null}

              {prediction.treatment.organic ? (
                <View className="mb-2.5">
                  <Text className="font-sans-bold text-xs text-ink">
                    Organic / Low-Cost Remedy:
                  </Text>
                  <Text className="font-sans text-xs text-ink-muted leading-4 mt-0.5">
                    {prediction.treatment.organic}
                  </Text>
                </View>
              ) : null}

              {prediction.treatment.spray_dosage ? (
                <View className="mb-2.5">
                  <Text className="font-sans-bold text-xs text-ink">
                    Backpack Pump Mixing Ratio:
                  </Text>
                  <Text className="font-sans text-xs text-ink-muted leading-4 mt-0.5">
                    {prediction.treatment.spray_dosage}
                  </Text>
                </View>
              ) : null}

              {prediction.treatment.management ? (
                <View className="mt-1 pt-2 border-t border-sage-dark/20">
                  <Text className="font-sans-bold text-[11px] text-ink-muted">
                    Field Sanitation & Care:
                  </Text>
                  <Text className="font-sans text-xs text-ink-muted leading-4 mt-0.5">
                    {prediction.treatment.management}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Button to Toggle Full Season Soil-Tailored Fertilizer Schedule */}
          {prediction.crop && (
            <View className="mt-3">
              <Pressable
                onPress={() => setShowNutrientPlan(!showNutrientPlan)}
                className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 active:bg-primary-dark shadow-xs"
              >
                <Text className="font-sans-bold text-xs text-white">
                  {showNutrientPlan
                    ? "Hide Fertilizer Schedule"
                    : `🌾 View Complete Fertilizer & Spray Plan for ${prediction.crop}`}
                </Text>
              </Pressable>

              {showNutrientPlan && (
                <View className="mt-4">
                  <FertilizerRecommendationCard
                    initialCrop={prediction.crop}
                    initialDisease={prediction.condition}
                  />
                </View>
              )}
            </View>
          )}

          {!isHealthy && !prediction.treatment && (
            <Text className="mt-3 text-xs text-ink-muted">
              ⚠️ Confirm with a local agronomist before starting chemical treatment.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function DiseaseDetectionScreen({ navigation }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---- Image selection ---------------------------------------------------

  const selectImage = async (useCamera: boolean) => {
    setResult(null);
    setErrorMessage(null);

    if (useCamera) {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your device settings to take a photo.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    try {
      const picked = useCamera
        ? await launchCameraAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          })
        : await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
          });

      if (!picked.canceled && picked.assets?.[0]) {
        setImageUri(picked.assets[0].uri);
        setResult(null);
      }
    } catch {
      Alert.alert("Error", "Could not open image picker. Please try again.");
    }
  };

  // ---- Analysis ----------------------------------------------------------

  const analyzeImage = async () => {
    if (!imageUri || analyzing) return;

    setAnalyzing(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await analyzeDisease(imageUri);
      setResult(response);
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setErrorMessage(
          "Could not reach the server. Make sure the backend is running and your device is on the same network."
        );
      } else {
        const detail =
          err instanceof Error ? err.message : "Unknown error occurred.";
        setErrorMessage(`Analysis failed: ${detail}`);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const resetScan = () => {
    setImageUri(null);
    setResult(null);
    setErrorMessage(null);
  };

  // ---- Render ------------------------------------------------------------

  return (
    <ScreenContainer scroll={false} safe>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Page header */}
        <View className="pt-4 pb-2">
          <BackButton className="mb-3" />
          <Text className="font-sans-extrabold text-2xl text-ink">
            Leaf Scan
          </Text>
          <Text className="text-sm text-ink-muted mt-1">
            Photograph a leaf to detect crop diseases
          </Text>
        </View>

        {/* Image preview area */}
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-full h-64 rounded-2xl mt-3"
            resizeMode="cover"
          />
        ) : (
          <View className="mt-3 h-64 items-center justify-center rounded-2xl border-2 border-dashed border-cream-dark bg-cream/50">
            <Text style={{ fontSize: 52 }}>🌿</Text>
            <Text className="mt-2 text-sm text-ink-muted text-center px-6">
              No image selected.{"\n"}Take a photo or choose from gallery.
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View className="mt-4 gap-3">
          {!imageUri ? (
            <>
              <PrimaryButton
                label="📷  Take Photo"
                onPress={() => selectImage(true)}
              />
              <PrimaryButton
                label="🖼  Choose from Gallery"
                variant="outline"
                onPress={() => selectImage(false)}
              />
            </>
          ) : (
            <>
              <PrimaryButton
                label={analyzing ? "Analysing…" : "🔬  Analyse Leaf"}
                onPress={analyzeImage}
                disabled={analyzing}
              />
              <PrimaryButton
                label="↩  Use Different Image"
                variant="outline"
                onPress={resetScan}
                disabled={analyzing}
              />
            </>
          )}
        </View>

        {/* Loading indicator */}
        {analyzing && (
          <View className="mt-6 items-center gap-2">
            <ActivityIndicator color={colors.forest} size="large" />
            <Text className="text-sm text-ink-muted">
              Running disease detection…
            </Text>
          </View>
        )}

        {/* Error state */}
        {errorMessage && !analyzing && (
          <View className="mt-5 rounded-2xl border border-danger/30 bg-red-50 p-4">
            <Text className="font-sans-bold text-sm text-danger mb-1">
              ✕ Something went wrong
            </Text>
            <Text className="text-xs text-ink-muted">{errorMessage}</Text>
            <PrimaryButton
              label="Try Again"
              onPress={analyzeImage}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {/* Result card */}
        {result && !analyzing && <ResultCard result={result} />}
      </ScrollView>
    </ScreenContainer>
  );
}
