import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";
import { FarmInputScreen } from "@/screens/main/FarmInputScreen";
import { AIProcessingScreen } from "@/screens/main/AIProcessingScreen";
import { RecommendationsScreen } from "@/screens/main/RecommendationsScreen";
import { RiskAnalysisScreen } from "@/screens/main/RiskAnalysisScreen";
import { SettingsScreen } from "@/screens/main/SettingsScreen";
import { DiseaseDetectionScreen } from "@/screens/main/DiseaseDetectionScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="FarmInput" component={FarmInputScreen} />
      <Stack.Screen name="AIProcessing" component={AIProcessingScreen} />
      <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
      <Stack.Screen name="RiskAnalysis" component={RiskAnalysisScreen} />
      <Stack.Screen name="DiseaseDetection" component={DiseaseDetectionScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
