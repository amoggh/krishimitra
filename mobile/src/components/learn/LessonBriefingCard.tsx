import React from "react";
import { View, Text } from "react-native";
import { colors, radii, shadows } from "@/theme/tokens";
import type { LessonItem } from "@/data/learnData";
import {
  Compass,
  Sprout,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Info,
} from "lucide-react-native";

interface LessonBriefingCardProps {
  lesson: LessonItem;
}

export function LessonBriefingCard({ lesson }: LessonBriefingCardProps) {
  const guide = lesson.guide;
  if (!guide) return null;

  return (
    <View
      className="mb-4 rounded-2xl bg-white p-4 lg:p-5 border border-primary/20"
      style={{
        borderRadius: radii.card,
        ...shadows.card,
      }}
    >
      {/* Top Header Badge */}
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 rounded-full bg-sage px-3 py-1 border border-sage-dark/40">
          <BookOpen size={13} color={colors.primary} />
          <Text className="font-sans-bold text-[11px] uppercase tracking-wider text-primary">
            Before You Begin · Lesson Orientation
          </Text>
        </View>

        <Text className="font-sans-bold text-xs text-ink-muted">
          Lesson {lesson.n} of 08
        </Text>
      </View>

      {/* Simple, bold, easily understandable headline */}
      <Text className="font-sans-extrabold text-lg lg:text-xl text-ink tracking-tight mb-3">
        {guide.simpleHeading}
      </Text>

      {/* 3 Core Essential Questions Breakdown */}
      <View className="gap-3">
        {/* 1. What is this lesson doing? */}
        <View className="rounded-xl bg-cream/70 p-3.5 border border-borderSubtle/60">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Compass size={14} color={colors.primary} />
            </View>
            <Text className="font-sans-extrabold text-xs text-ink uppercase tracking-wide">
              1. What Is This Lesson Doing?
            </Text>
          </View>
          <Text className="font-sans text-xs leading-5 text-ink">
            {guide.whatDoing}
          </Text>
        </View>

        {/* 2. How does it relate to agriculture? */}
        <View className="rounded-xl bg-sage/30 p-3.5 border border-sage/60">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="h-6 w-6 items-center justify-center rounded-lg bg-forest/15">
              <Sprout size={14} color={colors.forest} />
            </View>
            <Text className="font-sans-extrabold text-xs text-forest uppercase tracking-wide">
              2. How Does It Relate To Agriculture?
            </Text>
          </View>
          <Text className="font-sans text-xs leading-5 text-ink">
            {guide.howRelatedToAgri}
          </Text>
        </View>

        {/* 3. How will it benefit you? */}
        <View className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200/70">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="h-6 w-6 items-center justify-center rounded-lg bg-amber-100">
              <Lightbulb size={14} color={colors.accent} />
            </View>
            <Text className="font-sans-extrabold text-xs text-amber-900 uppercase tracking-wide">
              3. How Will It Benefit You? (What You Will Know)
            </Text>
          </View>
          <Text className="font-sans text-xs leading-5 text-ink">
            {guide.howBenefitsYou}
          </Text>
        </View>
      </View>

      {/* Lab Clarification / Confusion Buster Box */}
      {guide.labClarification && (
        <View className="mt-3 flex-row items-start gap-2.5 rounded-xl bg-sky-50/80 p-3 border border-sky-200/80">
          <View className="mt-0.5">
            <Info size={15} color="#0284C7" />
          </View>
          <View className="flex-1">
            <Text className="font-sans-bold text-[11px] text-sky-950 mb-0.5">
              Quick Practical Note
            </Text>
            <Text className="font-sans text-xs text-sky-900 leading-4.5">
              {guide.labClarification}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default LessonBriefingCard;
