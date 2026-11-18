import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import {
  PackageCheck,
  Scale,
  Gavel,
  FileText,
  BadgeIndianRupee,
  Truck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";

const STAGES = [
  {
    step: 1,
    title: "1. APMC Gate Inward & Gross Weighment",
    icon: Truck,
    desc: "Your loaded vehicle enters the APMC yard. The gate operator records commodity, farmer name, and weighs the loaded vehicle on the electronic weighbridge to generate the initial Gate Pass.",
    tip: "Keep your RTC/Pahani copy and Aadhaar handy for verification at the entrance.",
  },
  {
    step: 2,
    title: "2. Yard Unloading & Lot Display",
    icon: PackageCheck,
    desc: "Bags are unloaded on the auction floor assigned to your licensed Commission Agent (Dalal). A small representative cut is opened for buyers to inspect moisture, grain size, and purity.",
    tip: "Clean and grade at your farm beforehand: clean lots consistently fetch ₹150–300/q higher bids.",
  },
  {
    step: 3,
    title: "3. Open Auction / e-NAM Bidding",
    icon: Gavel,
    desc: "Traders gather around the heap. The auctioneer conducts open outcry bidding or buyers submit bids digitally via e-NAM terminals. The highest bidder wins the lot.",
    tip: "You have the legal right under Karnataka APMC Act to reject any bid below your acceptable minimum.",
  },
  {
    step: 4,
    title: "4. Tare Weighment & Net Weight",
    icon: Scale,
    desc: "The produce is weighed by licensed weighmen (Tolaha) using standard calibrated beam or electronic scales. The empty vehicle tare weight is subtracted to determine certified net weight.",
    tip: "Check the weighman's verification stamp. Gunny bag allowance is strictly standardized (1 kg/bag).",
  },
  {
    step: 5,
    title: "5. Takpatti / Sale Slip Generation",
    icon: FileText,
    desc: "The commission agent issues the official Takpatti (Sale Slip) specifying net weight, modal auction rate, authorized commission (buyer-side), statutory mandi cess, and final net payable amount.",
    tip: "Under Karnataka rules, commission is legally payable by the BUYER, not deducted from the farmer.",
  },
  {
    step: 6,
    title: "6. Payment Settlement & Bank Credit",
    icon: BadgeIndianRupee,
    desc: "The buyer settles payment directly into your Aadhaar-linked bank account via RTGS/NEFT or direct APMC settlement account on the same day or within 24 hours.",
    tip: "Always retain your copy of the stamped Takpatti for agricultural income proof and KCC limits.",
  },
];

export function SackJourney() {
  const [activeStep, setActiveStep] = useState(0);

  const stage = STAGES[activeStep];
  const IconComponent = stage.icon;

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
            The Journey of a Harvest Sack at APMC
          </Text>
          <Text className="font-sans text-[11px] text-ink-muted">
            Step-by-step transparent guide to selling at Karnataka regulated market yards
          </Text>
        </View>
        <Text className="font-sans-bold text-xs text-primary">
          Step {activeStep + 1} of 6
        </Text>
      </View>

      {/* Step Indicators */}
      <View className="mb-4 flex-row items-center justify-between px-2">
        {STAGES.map((s, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          return (
            <Pressable
              key={s.step}
              onPress={() => setActiveStep(idx)}
              className="items-center"
            >
              <View
                className={`h-7 w-7 items-center justify-center rounded-full border transition-all ${
                  isCurrent
                    ? "bg-primary border-primary scale-110 shadow-sm"
                    : isDone
                    ? "bg-sage border-primary/40"
                    : "bg-cream border-borderSubtle"
                }`}
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    isCurrent ? "text-white" : "text-ink"
                  }`}
                >
                  {s.step}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Active Stage Card */}
      <View className="rounded-xl bg-sage/60 p-4 border border-sage-dark/40">
        <View className="flex-row items-center gap-3 mb-2">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-2xs border border-primary/20">
            <IconComponent size={20} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-bold text-sm text-ink">
              {stage.title}
            </Text>
          </View>
        </View>

        <Text className="font-sans text-xs leading-5 text-ink-muted mb-3">
          {stage.desc}
        </Text>

        <View className="rounded-lg bg-white/80 p-2.5 border border-primary/10">
          <Text className="font-sans text-[11px] text-primary">
            <Text className="font-sans-bold">Raitha Advice: </Text>
            {stage.tip}
          </Text>
        </View>
      </View>

      {/* Stepper Navigation Buttons */}
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => setActiveStep((p) => Math.max(0, p - 1))}
          disabled={activeStep === 0}
          className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 border ${
            activeStep === 0
              ? "opacity-30 border-borderSubtle bg-cream"
              : "bg-white border-borderSubtle active:bg-cream"
          }`}
        >
          <ChevronLeft size={14} color={colors.textPrimary} />
          <Text className="font-sans-bold text-xs text-ink">Previous</Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveStep((p) => Math.min(STAGES.length - 1, p + 1))}
          disabled={activeStep === STAGES.length - 1}
          className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 border ${
            activeStep === STAGES.length - 1
              ? "opacity-30 border-borderSubtle bg-cream"
              : "bg-primary border-primary active:bg-primary-dark"
          }`}
        >
          <Text
            className={`font-sans-bold text-xs ${
              activeStep === STAGES.length - 1 ? "text-ink" : "text-white"
            }`}
          >
            Next Step
          </Text>
          <ChevronRight
            size={14}
            color={activeStep === STAGES.length - 1 ? colors.textPrimary : colors.white}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default SackJourney;
