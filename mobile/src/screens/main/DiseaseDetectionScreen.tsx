import React, { useState } from "react";
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

type Props = RootStackScreenProps<"DiseaseDetection">;

export function DiseaseDetectionScreen({ route, navigation }: Props) {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(
    route.params?.imageUri ?? null
  );
  const [selectedImageType, setSelectedImageType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing leaf...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);

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
          ? "Cannot connect to Krishimitra AI backend. Please verify your connection."
          : `Diagnosis failed: ${msg}`
      );
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  };

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
            Crop Disease Detection
          </Text>
          <Text className="text-sm font-sans-medium text-ink-muted mt-0.5">
            AI-powered plant disease diagnosis, verified CIBRC remedies & live market pricing
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
              Running deep neural model & querying verified agri-databases
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

        {/* ========================================================== */}
        {/* RESULTS SECTION                                            */}
        {/* ========================================================== */}
        {result && (
          <>
            {/* Primary Diagnosis Card */}
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

            {/* Low Confidence / Uncertain Notice */}
            {result.prediction.status === "uncertain" && (
              <View className="rounded-2xl bg-warning-bg p-4 border border-warning-border mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                  <Text className="font-sans-bold text-sm text-warning">
                    Low Model Confidence
                  </Text>
                </View>
                <Text className="text-xs font-sans-medium text-ink-muted leading-5">
                  The AI model is not fully certain about this diagnosis. Please take a clear, well-lit photo of the affected leaf area from 15-20 cm away and try again.
                </Text>
              </View>
            )}

            {/* Healthy Crop Success Message */}
            {result.prediction.is_healthy && (
              <View className="rounded-2xl bg-success-bg p-4 border border-success-border mb-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text style={{ fontSize: 18 }}>🌱</Text>
                  <Text className="font-sans-bold text-sm text-success">
                    Healthy Crop Confirmed
                  </Text>
                </View>
                <Text className="text-xs font-sans-medium text-ink leading-5">
                  No visual pathogens, fungal blights, or viral symptoms were detected on this leaf sample. Maintain standard preventive agronomic practices and balanced irrigation.
                </Text>
              </View>
            )}

            {/* ========================================================== */}
            {/* PESTICIDE RECOMMENDATIONS                                  */}
            {/* ========================================================== */}
            {!result.prediction.is_healthy && (
              <Card className="mb-4">
                <SectionTitle>Verified Pesticide Recommendations</SectionTitle>
                <Text className="text-xs text-ink-muted mb-3">
                  Scientifically validated treatments based on CIBRC & agricultural extension registries
                </Text>

                {result.pesticides.length === 0 ? (
                  <View className="rounded-xl bg-secondary/50 p-3.5 border border-border">
                    <Text className="text-xs font-sans-medium text-ink-muted">
                      No registered pesticide is currently available for this specific disease record. Please consult your local Krishi Vigyan Kendra (KVK).
                    </Text>
                  </View>
                ) : (
                  result.pesticides.map((pesticide, index) => (
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

                      {pesticide.note ? (
                        <Text className="text-xs text-ink-muted mt-1 leading-4">
                          Note: {pesticide.note}
                        </Text>
                      ) : null}

                      <Text className="text-2xs text-ink-muted mt-2">
                        Authority Source: {pesticide.verification_source}
                      </Text>

                      <Text className="text-2xs text-amber-800 bg-amber-50 rounded p-1.5 mt-2 leading-4">
                        ⚠️ Reference only. Follow local Indian label regulations and extension guidelines.
                      </Text>

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
                  ))
                )}
              </Card>
            )}

            {/* ========================================================== */}
            {/* ONLINE PESTICIDE PRICES                                    */}
            {/* ========================================================== */}
            {!result.prediction.is_healthy && (
              <Card className="mb-4">
                <SectionTitle>Online Market Price Reference</SectionTitle>
                <Text className="text-xs text-ink-muted mb-3">
                  Live pricing tracked across verified online agri-input marketplaces
                </Text>

                {result.pesticide_prices.length === 0 ? (
                  <View className="rounded-xl bg-secondary/50 p-3.5 border border-border">
                    <Text className="text-xs font-sans-medium text-ink-muted">
                      Live online price quotes are temporarily unavailable. Check local input dealers for current retail rates.
                    </Text>
                  </View>
                ) : (
                  result.pesticide_prices.slice(0, 3).map((price, index) => {
                    const formattedPrice =
                      price.price != null
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: price.currency || "INR",
                            maximumFractionDigits: 0,
                          }).format(price.price)
                        : "Price unavailable";

                    const formattedMrp =
                      price.mrp != null
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: price.currency || "INR",
                            maximumFractionDigits: 0,
                          }).format(price.mrp)
                        : null;

                    return (
                      <View
                        key={`${price.product}-${price.pack_size || ""}-${index}`}
                        className="rounded-xl border border-border bg-white p-3.5 mb-3 last:mb-0 shadow-xs"
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 mr-2">
                            <Text className="font-sans-bold text-sm text-ink">
                              {price.product}
                            </Text>
                            {(price.pack_size || price.pack_sizes?.[0]) && (
                              <Text className="text-xs text-ink-muted mt-0.5">
                                Pack Size: {price.pack_size || price.pack_sizes[0]}
                              </Text>
                            )}
                            <Text className="text-xs text-ink-muted mt-0.5">
                              Seller: {price.seller}
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="font-sans-extrabold text-base text-forest">
                              {formattedPrice}
                            </Text>
                            {formattedMrp && (
                              <Text className="text-2xs text-ink-muted line-through">
                                MRP {formattedMrp}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border">
                          <Text className="text-2xs text-ink-muted">
                            Verified Agri-Supplier
                          </Text>

                          {price.source_url ? (
                            <Pressable
                              onPress={() => void openExternalLink(price.source_url)}
                              className="rounded-lg bg-forest px-3 py-1.5 active:opacity-90"
                            >
                              <Text className="text-xs font-sans-bold text-white">
                                View Product ↗
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}

                <Text className="text-2xs text-ink-muted mt-2">
                  {result.price_note || "Online reference prices; actual dealer counter prices may vary by region."}
                </Text>
              </Card>
            )}

            {/* Reset / Analyze Another Photo */}
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
      </ScrollView>
    </ScreenContainer>
  );
}

export default DiseaseDetectionScreen;
