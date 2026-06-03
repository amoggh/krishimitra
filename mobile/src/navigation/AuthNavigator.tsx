import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/types/navigation";
import { SplashScreen } from "@/screens/auth/SplashScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
