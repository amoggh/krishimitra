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
import { PrimaryButton, ScreenContainer } from "@/components/ui";
import { colors } from "@/theme/colors";
import { analyzeDisease, type DiseaseResult } from "@/services/api/diseaseService";

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
    msg.includes("failed to connect")
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultCard({ result }: { result: DiseaseResult }) {
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
        <View className="rounded-xl bg-cream p-3">
          <Text className="text-sm text-ink">
            The model could not identify the disease reliably
            {prediction.confidence > 0
              ? ` (confidence: ${confidencePct(prediction.confidence)})`
              : ""}
            .
          </Text>
          <Text className="mt-2 text-xs text-ink-muted">
            Tips: use a clear, well-lit photo of a single leaf, fill the
            frame, and avoid shadows or blurry edges.
          </Text>
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
          <View className="flex-row gap-2">
            <View className="flex-1 rounded-lg bg-cream p-3">
              <Text className="text-xs text-ink-muted mb-0.5">Status</Text>
              <Text
                className="font-sans-bold text-sm"
                style={{ color: headerColor }}
              >
                {isHealthy ? "Healthy" : "Diseased"}
              </Text>
            </View>
            <View className="flex-1 rounded-lg bg-cream p-3">
              <Text className="text-xs text-ink-muted mb-0.5">Confidence</Text>
              <Text className="font-sans-bold text-sm text-ink">
                {confidencePct(prediction.confidence)}
              </Text>
            </View>
          </View>

          {!isHealthy && (
            <Text className="mt-3 text-xs text-ink-muted">
              ⚠️ Confirm with a local agronomist before starting any treatment.
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
          <Pressable onPress={() => navigation.goBack()} className="mb-3">
            <Text className="text-sm text-forest">← Back</Text>
          </Pressable>
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
