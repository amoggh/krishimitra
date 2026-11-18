import React from "react";
import { View, Text, ScrollView, Pressable, Linking, Platform, Alert } from "react-native";
import {
  HelpCircle,
  PhoneCall,
  Landmark,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
  Network,
  School,
  ExternalLink,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { ScreenContainer } from "@/components/ui";
import { SCHEMES, type SchemeItem } from "@/data/learnData";

const ICONS = [Landmark, ShieldCheck, CreditCard, FileSpreadsheet, Network, School];

export function SupportScreen() {
  const callHelpline = () => {
    const phone = "tel:18001801551";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = phone;
    } else {
      Linking.openURL(phone).catch(() => {
        Alert.alert("Helpline Number", "Call toll-free: 1800-180-1551");
      });
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        {/* Header */}
        <View className="mb-4">
          <Text className="font-sans-extrabold text-2xl text-ink">
            Government Schemes & Raitha Support
          </Text>
          <Text className="text-xs text-ink-muted">
            Direct financial subsidies, crop insurance, and verified helpline contacts
          </Text>
        </View>

        {/* Kisan Call Centre Emergency Helpline Banner */}
        <View className="mb-4 overflow-hidden rounded-2xl bg-primary p-5 shadow-sm border border-primary-dark">
          <View className="flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                <Text className="font-sans-bold text-[10px] uppercase tracking-wider text-emerald-200">
                  Toll-Free Kisan Call Centre
                </Text>
              </View>
              <Text className="font-sans-extrabold text-xl text-white">
                Stuck on Field? Speak to a Real Agronomist
              </Text>
              <Text className="font-sans text-xs text-white/80 mt-1">
                Free agricultural advice in Kannada, English, and Hindi. Available daily from 6:00 AM to 10:00 PM.
              </Text>
            </View>

            <Pressable
              onPress={callHelpline}
              className="flex-row items-center gap-2 rounded-full bg-[#E9B44C] px-5 py-3 shadow-sm active:bg-amber-500"
            >
              <PhoneCall size={18} color="#183B2B" strokeWidth={2.4} />
              <Text className="font-sans-extrabold text-base text-[#183B2B]">
                1800-180-1551
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Schemes Grid */}
        <Text className="mb-3 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Active Central & Karnataka Agricultural Programs
        </Text>

        <View className="gap-3 mb-6">
          {SCHEMES.map((scheme, idx) => {
            const IconComponent = ICONS[idx % ICONS.length];
            return (
              <View
                key={scheme.name}
                className="rounded-2xl bg-white p-4 border border-primary/20 shadow-xs"
              >
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-sage">
                    <IconComponent size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-extrabold text-base text-ink">
                      {scheme.name}
                    </Text>
                  </View>
                </View>

                <Text className="font-sans text-xs leading-5 text-ink-muted mb-2.5">
                  {scheme.what}
                </Text>

                <View className="rounded-xl bg-cream p-3 border border-borderSubtle">
                  <Text className="font-sans text-xs text-ink">
                    <Text className="font-sans-bold text-primary">How to Apply: </Text>
                    {scheme.how}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Raitha Samparka Kendra Guidance Card */}
        <View className="rounded-2xl bg-sage/60 p-4 border border-sage-dark/40">
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-primary mb-1">
            Raitha Samparka Kendra (RSK) Local Assistance
          </Text>
          <Text className="font-sans text-xs leading-5 text-ink">
            Every Hobli in Karnataka has a dedicated RSK staffed by Agriculture Officers.
            Visit your local RSK with your land RTC (Pahani) for subsidized seeds, micro-nutrient kits, soil health card sampling, and sprinkler/drip irrigation subsidies (up to 90% for SC/ST, 75% for small/marginal farmers under PMKSY).
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export default SupportScreen;
