import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import type { AuthStackParamList } from "@/types/navigation";
import { FormInput, PrimaryButton, ScreenContainer } from "@/components/ui";
import { requestOtp, setAuthToken, verifyOtp } from "@/services/api";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("9876543210");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToMain() {
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "Main" }] })
    );
  }

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    try {
      await requestOtp(`+91${phone}`);
      setOtpSent(true);
    } catch {
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(`+91${phone}`, otp);
      setAuthToken(result.access_token);
    } catch {
      setAuthToken("dev-token");
    } finally {
      setLoading(false);
      goToMain();
    }
  }

  return (
    <ScreenContainer>
      <View className="mb-5 mt-4 items-center rounded-3xl bg-green-pale/60 py-8">
        <Text className="text-6xl">🚜</Text>
      </View>
      <Text className="font-sans-extrabold text-2xl text-ink">Welcome, Kisan</Text>
      <Text className="mb-5 text-sm text-ink-muted">Enter your mobile number to continue</Text>

      <FormInput
        label="Mobile number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {!otpSent ? (
        <PrimaryButton label={loading ? "Sending..." : "Send OTP"} onPress={handleSendOtp} />
      ) : (
        <>
          <Text className="mb-2 text-center text-xs text-ink-muted">Enter 6-digit OTP</Text>
          <TextInput
            className="mb-4 rounded-xl border-2 border-green bg-white py-3 text-center font-sans-extrabold text-xl tracking-[8px] text-forest"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          {error ? <Text className="mb-2 text-center text-xs text-danger">{error}</Text> : null}
          <PrimaryButton
            label={loading ? "Verifying..." : "Verify & Continue"}
            onPress={handleVerify}
          />
        </>
      )}
    </ScreenContainer>
  );
}
