module.exports = ({ config }) => {
  const googleMapsKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "YOUR_GOOGLE_MAPS_API_KEY";

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        googleMapsApiKey: googleMapsKey,
      },
    },
    android: {
      ...config.android,
      config: {
        googleMaps: {
          apiKey: googleMapsKey,
        },
      },
    },
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1",
      dataGovInApiKey: process.env.EXPO_PUBLIC_DATA_GOV_IN_API_KEY || "",
      openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || "",
      googleMapsApiKey: googleMapsKey,
    },
  };
};

