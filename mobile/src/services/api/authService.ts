import { apiClient } from "./client";

export async function requestOtp(phone: string): Promise<{ message: string }> {
  const { data } = await apiClient.post("/auth/otp/request", { phone });
  return data;
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ access_token: string; farmer_id: string }> {
  const { data } = await apiClient.post("/auth/otp/verify", { phone, otp });
  return data;
}
