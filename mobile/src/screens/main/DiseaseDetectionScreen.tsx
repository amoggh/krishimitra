import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import {
  analyzeDisease,
  type DiseaseResult,
} from "../../services/api/diseaseService";
import type { RootStackScreenProps } from "../../types/navigation";

type Props = RootStackScreenProps<"DiseaseDetection">;

export function DiseaseDetectionScreen({ route, navigation }: Props) {
  const [selectedImageUri, setSelectedImageUri] = useState(
    route.params?.imageUri ?? null,
  );
  const [selectedImageType, setSelectedImageType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing leaf...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);

  const state = route.params?.state?.trim() || "Karnataka";
  const district = route.params?.district?.trim() || "Haveri";

  const openExternalLink = async (url: string | null) => {
    if (!url) {
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("Unable to open reference URL", error);
      Alert.alert("Unable to open link", "Please try again later.");
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
      setErrorMessage("Unable to open the image picker. Please try again.");
    }
  };

  const detectDisease = async () => {
    if (!selectedImageUri) {
      setErrorMessage("Select or capture a clear leaf image to continue.");
      return;
    }

    setLoading(true);
    setLoadingMessage("Analyzing leaf...");
    setErrorMessage(null);

    const loadingTimer = setTimeout(() => {
      setLoadingMessage("Fetching current pesticide prices...");
    }, 1500);

    try {
      const response = await analyzeDisease(
        selectedImageUri,
        selectedImageType,
        state,
        district,
      );
      setResult(response);
    } catch (error) {
      console.warn("Disease detection request failed", error);
      setErrorMessage(
        "We couldn't analyze this image right now. Check your connection and try again.",
      );
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  };


  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  const confidence =
    result
      ? (result.prediction.confidence * 100).toFixed(2)
      : 0;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <ScrollView
      style={
        styles.container
      }

      contentContainerStyle={
        styles.content
      }
    >

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <Text
        style={
          styles.title
        }
      >
        Disease Detection
      </Text>


      <Text
        style={
          styles.subtitle
        }
      >
        AI-powered crop disease detection
      </Text>


      {/* ================================================== */}
      {/* IMAGE */}
      {/* ================================================== */}

      {selectedImageUri && (

        <Image
          source={{
            uri: selectedImageUri,
          }}

          style={
            styles.image
          }
        />

      )}

      {!loading && (
        <View style={styles.imageActions}>
          <TouchableOpacity
            style={styles.imageActionButton}
            onPress={() => void selectImage(false)}
          >
            <Text style={styles.imageActionText}>Choose Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.imageActionButton}
            onPress={() => void selectImage(true)}
          >
            <Text style={styles.imageActionText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================== */}
      {/* DETECT BUTTON */}
      {/* ================================================== */}

      {!result &&
        !loading && (

          <TouchableOpacity
            style={
              styles.detectButton
            }

            onPress={
              detectDisease
            }
          >

            <Text
              style={
                styles.buttonText
              }
            >
              Detect Disease
            </Text>

          </TouchableOpacity>

        )}


      {/* ================================================== */}
      {/* LOADING */}
      {/* ================================================== */}

      {loading && (

        <View
          style={
            styles.loadingBox
          }
        >

          <ActivityIndicator
            size="large"
          />


          <Text
            style={
              styles.loadingText
            }
          >
            {loadingMessage}
          </Text>

        </View>

      )}

      {errorMessage && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>{errorMessage}</Text>
        </View>
      )}


      {/* ================================================== */}
      {/* RESULT */}
      {/* ================================================== */}

      {result && (

        <>

          {/* ============================================== */}
          {/* DISEASE RESULT */}
          {/* ============================================== */}

          <View
            style={
              styles.card
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              {result.prediction.is_healthy ? "Crop Status" : "Disease Detected"}
            </Text>


            {/* CROP */}

            <Text
              style={
                styles.label
              }
            >
              Crop
            </Text>


            <Text
              style={
                styles.value
              }
            >
              {result.prediction.crop ||
                "Unknown"}
            </Text>


            {/* DISEASE */}

            <Text
              style={
                styles.label
              }
            >
              Disease
            </Text>


            <Text
              style={
                styles.disease
              }
            >
              {
                result.prediction.condition
              }
            </Text>


            {/* CONFIDENCE */}

            <Text
              style={
                styles.label
              }
            >
              Confidence
            </Text>


            <Text
              style={
                styles.confidence
              }
            >
              {confidence}%
            </Text>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>
              {result.prediction.is_healthy === null
                ? "Unknown"
                : result.prediction.is_healthy
                  ? "Healthy"
                  : "Unhealthy"}
            </Text>


            {/* LOCATION */}

            <Text
              style={
                styles.location
              }
            >
              Location:{" "}
              {state}

              {district
                ? `, ${district}`
                : ""}
            </Text>

          </View>


          {/* ============================================== */}
          {/* LOW CONFIDENCE */}
          {/* ============================================== */}

          {
            result.prediction.status ===
              "uncertain" && (

              <View
                style={
                  styles.warningCard
                }
              >

                <Text
                  style={
                    styles.warningTitle
                  }
                >
                  Low Confidence
                </Text>


                <Text
                  style={
                    styles.warningText
                  }
                >
                  The model is not sufficiently
                  confident about this diagnosis.
                  Please capture a clear image of
                  the affected leaf.
                </Text>

              </View>

            )
          }


          {/* ============================================== */}
          {/* HEALTHY */}
          {/* ============================================== */}

          {
            result.prediction.is_healthy && (

              <View
                style={
                  styles.successCard
                }
              >

                <Text
                  style={
                    styles.successTitle
                  }
                >
                  Healthy Crop
                </Text>


                <Text
                  style={
                    styles.successText
                  }
                >
                  No disease was detected by
                  the model.
                </Text>

              </View>

            )
          }


          {/* ============================================== */}
          {/* PESTICIDES */}
          {/* ============================================== */}

          {
            !result.prediction.is_healthy && (

              <View
                style={
                  styles.card
                }
              >

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Pesticide Recommendation
                </Text>


                {result.pesticides.length ===
                  0 ? (

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    No pesticide recommendation is currently available for this disease.
                  </Text>

                ) : (

                  result.pesticides.map(
                    (
                      pesticide,
                      index
                    ) => (

                      <View
                        key={
                          `${pesticide.active_ingredient}-${index}`
                        }

                        style={
                          styles.pesticideCard
                        }
                      >

                        {/* PRODUCT */}

                        <Text
                          style={
                            styles.productName
                          }
                        >
                          {
                            pesticide.product_type
                          }
                        </Text>


                        {/* ACTIVE INGREDIENT */}

                        <Text
                          style={
                            styles.detail
                          }
                        >
                          Active ingredient:{" "}
                          {
                            pesticide.active_ingredient
                          }
                        </Text>


                        {/* FORMULATION */}

                        {
                          pesticide.formulation && (

                            <Text
                              style={
                                styles.detail
                              }
                            >
                              Formulation:{" "}
                              {
                                pesticide.formulation
                              }
                            </Text>

                          )
                        }


                        {/* SOURCE */}

                        <Text
                          style={
                            styles.source
                          }
                        >
                          Recommendation status:{" "}
                          {
                            pesticide.recommendation_status
                          }
                        </Text>

                        <Text style={styles.source}>
                          Reference source: {pesticide.verification_source}
                        </Text>

                        <Text style={styles.referenceNote}>
                          Reference only. This is not a confirmation of Indian product registration or approval. Follow current Indian label directions and local extension guidance.
                        </Text>

                        {pesticide.note ? (
                          <Text style={styles.detail}>{pesticide.note}</Text>
                        ) : null}

                        {pesticide.source_url ? (
                          <TouchableOpacity
                            onPress={() => void openExternalLink(pesticide.source_url)}
                          >
                            <Text style={styles.linkText}>View reference</Text>
                          </TouchableOpacity>
                        ) : null}

                      </View>

                    )
                  )

                )}

              </View>

            )
          }


          {/* ============================================== */}
          {/* ONLINE PRICES */}
          {/* ============================================== */}

          {
            !result.prediction.is_healthy && (

              <View
                style={
                  styles.card
                }
              >

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Online Price Reference
                </Text>


                {
                  result.pesticide_prices.slice(0, 3).map(
                    (
                      price,
                      index
                    ) => (

                      <View
                        key={
                          `${price.product}-${price.pack_size || ""}-${index}`
                        }

                        style={
                          styles.priceCard
                        }
                      >

                        {/* PRODUCT */}

                        <Text
                          style={
                            styles.productName
                          }
                        >
                          {
                            price.product
                          }
                        </Text>


                        {/* PRICE */}

                        <Text
                          style={
                            styles.price
                          }
                        >
                          {price.price == null
                            ? "Price unavailable"
                            : new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: price.currency || "INR",
                                maximumFractionDigits: 2,
                              }).format(price.price)}
                        </Text>

                        {price.mrp != null ? (
                          <Text style={styles.detail}>
                            MRP: {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: price.currency || "INR",
                              maximumFractionDigits: 2,
                            }).format(price.mrp)}
                          </Text>
                        ) : null}

                        {(price.pack_size || price.pack_sizes[0]) ? (
                          <Text style={styles.detail}>
                            Pack size: {price.pack_size || price.pack_sizes[0]}
                          </Text>
                        ) : null}

                        <Text style={styles.detail}>Seller: {price.seller}</Text>
                        <Text style={styles.onlineLabel}>Online reference price</Text>

                        {price.checked_at ? (
                          <Text style={styles.timestamp}>
                            Checked: {new Date(price.checked_at).toLocaleString()}
                          </Text>
                        ) : null}

                        {price.source_url ? (
                          <TouchableOpacity
                            style={styles.viewProductButton}
                            onPress={() => void openExternalLink(price.source_url)}
                          >
                            <Text style={styles.viewProductText}>View Product</Text>
                          </TouchableOpacity>
                        ) : null}

                      </View>

                    )
                  )
                }

                {result.pesticide_prices.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Live pesticide prices are currently unavailable.
                  </Text>
                ) : null}

                {/* PRICE NOTE */}

                <Text
                  style={
                    styles.priceNote
                  }
                >
                  {
                    result.price_note ||
                    "Online reference price. Actual local dealer price may differ."
                  }
                </Text>

              </View>

            )
          }


          {/* ============================================== */}
          {/* BACK */}
          {/* ============================================== */}

          <TouchableOpacity
            style={
              styles.secondaryButton
            }

            onPress={() =>
              navigation.goBack()
            }
          >

            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Back
            </Text>

          </TouchableOpacity>

        </>

      )}

    </ScrollView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        "#F5F7FA",
    },


    content: {
      padding: 20,
      paddingBottom: 40,
    },


    title: {
      fontSize: 26,
      fontWeight: "700",
      marginBottom: 5,
    },


    subtitle: {
      fontSize: 14,
      color: "#666",
      marginBottom: 20,
    },


    image: {
      width: "100%",
      height: 280,
      borderRadius: 16,
      marginBottom: 20,
    },

    imageActions: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },

    imageActionButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#2E7D32",
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
    },

    imageActionText: {
      color: "#2E7D32",
      fontWeight: "700",
    },

    detectButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor:
        "#2E7D32",
    },


    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },


    loadingBox: {
      alignItems: "center",
      padding: 30,
    },


    loadingText: {
      marginTop: 12,
      color: "#555",
    },


    card: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 18,

      marginBottom: 16,

      shadowOpacity: 0.05,

      shadowRadius: 5,

      elevation: 2,
    },


    sectionTitle: {
      fontSize: 19,
      fontWeight: "700",
      marginBottom: 16,
    },


    label: {
      fontSize: 13,
      color: "#777",
      marginTop: 10,
    },


    value: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 3,
    },


    disease: {
      fontSize: 21,
      fontWeight: "700",
      marginTop: 3,
    },


    confidence: {
      fontSize: 25,
      fontWeight: "800",
      marginTop: 3,
    },


    location: {
      marginTop: 15,
      fontSize: 13,
      color: "#666",
    },


    warningCard: {
      backgroundColor:
        "#FFF4E5",

      borderRadius: 14,

      padding: 16,

      marginBottom: 16,
    },


    warningTitle: {
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 6,
    },


    warningText: {
      color: "#555",
      lineHeight: 20,
    },


    successCard: {
      backgroundColor:
        "#E8F5E9",

      borderRadius: 14,

      padding: 16,

      marginBottom: 16,
    },


    successTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 5,
    },


    successText: {
      color: "#444",
    },


    pesticideCard: {
      borderWidth: 1,

      borderColor:
        "#E0E0E0",

      borderRadius: 12,

      padding: 14,

      marginBottom: 12,
    },


    productName: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 6,
    },


    detail: {
      fontSize: 13,
      color: "#666",
      marginTop: 3,
    },


    source: {
      fontSize: 12,
      color: "#2E7D32",
      marginTop: 8,
    },

    referenceNote: {
      color: "#76551B",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
    },

    linkText: {
      color: "#2E7D32",
      fontWeight: "700",
      marginTop: 10,
      textDecorationLine: "underline",
    },

    priceCard: {
      borderWidth: 1,

      borderColor:
        "#E0E0E0",

      borderRadius: 12,

      padding: 14,

      marginBottom: 12,
    },

    onlineLabel: {
      color: "#2E7D32",
      fontSize: 12,
      fontWeight: "700",
      marginTop: 8,
    },

    viewProductButton: {
      backgroundColor: "#2E7D32",
      borderRadius: 9,
      alignItems: "center",
      padding: 12,
      marginTop: 12,
    },

    viewProductText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },

    price: {
      fontSize: 24,
      fontWeight: "800",
      marginVertical: 5,
    },


    timestamp: {
      fontSize: 11,
      color: "#888",
      marginTop: 7,
    },


    priceNote: {
      fontSize: 12,
      color: "#777",
      lineHeight: 18,
      marginTop: 5,
    },


    emptyText: {
      color: "#666",
      lineHeight: 20,
    },


    secondaryButton: {
      borderWidth: 1,

      borderColor:
        "#2E7D32",

      borderRadius: 12,

      padding: 15,

      alignItems: "center",

      marginTop: 5,
    },


    secondaryButtonText: {
      color: "#2E7D32",
      fontSize: 16,
      fontWeight: "700",
    },
  });