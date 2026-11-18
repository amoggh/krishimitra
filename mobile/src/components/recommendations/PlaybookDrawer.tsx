import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { X, CheckCircle2, Circle, Calendar, Sprout, ShieldAlert } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { CROP_BY_ID, type CropInfo } from "@/data/cropsData";

export interface PlaybookDrawerProps {
  cropId: string;
  sowingMonthIndex?: number; // 0 for Jan, 5 for June
  visible: boolean;
  onClose: () => void;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function PlaybookDrawer({
  cropId,
  sowingMonthIndex = 5, // June default (kharif)
  visible,
  onClose,
}: PlaybookDrawerProps) {
  const crop = CROP_BY_ID[cropId.toLowerCase()] || CROP_BY_ID["ragi"];
  const [completedWeeks, setCompletedWeeks] = useState<Record<number, boolean>>({});

  const toggleWeek = (wk: number) => {
    setCompletedWeeks((prev) => ({
      ...prev,
      [wk]: !prev[wk],
    }));
  };

  const getWeekDate = (wk: number) => {
    const start = new Date();
    start.setMonth(sowingMonthIndex);
    start.setDate(15);
    const d = new Date(start.getTime() + wk * 7 * 86400000);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  };

  const completedCount = crop?.plan?.filter(([wk]) => completedWeeks[wk])?.length || 0;
  const totalTasks = crop?.plan?.length || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-borderSubtle pb-4">
            <View className="flex-row items-center gap-2.5">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-sage">
                <Sprout size={22} color={colors.primary} />
              </View>
              <View>
                <Text className="font-sans-extrabold text-lg text-ink">
                  {crop?.name} Week-by-Week Playbook
                </Text>
                <Text className="font-sans text-xs text-ink-muted">
                  {crop?.kn} · {crop?.days} Days Growth Cycle
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-cream active:bg-sand"
            >
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Progress summary banner */}
          <View className="my-3.5 flex-row items-center justify-between rounded-xl bg-sage/60 p-3 border border-sage-dark/30">
            <View>
              <Text className="font-sans-bold text-xs text-primary">
                Task Progress: {completedCount} of {totalTasks} Completed
              </Text>
              <Text className="font-sans text-[11px] text-ink-muted">
                {crop?.seed}
              </Text>
            </View>
            <View className="rounded-full bg-white px-2.5 py-1 shadow-2xs border border-primary/20">
              <Text className="font-sans-bold text-xs text-primary">
                {totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}% Done
              </Text>
            </View>
          </View>

          {/* Task list */}
          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            <View className="gap-3 pt-1">
              {crop?.plan?.map(([wk, title, desc]) => {
                const isDone = Boolean(completedWeeks[wk]);
                return (
                  <Pressable
                    key={wk}
                    onPress={() => toggleWeek(wk)}
                    className={`flex-row items-start gap-3 rounded-2xl p-3.5 border transition-all ${
                      isDone
                        ? "bg-sage/40 border-primary/30"
                        : "bg-white border-borderSubtle shadow-2xs"
                    }`}
                  >
                    <View className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 size={20} color={colors.primary} />
                      ) : (
                        <Circle size={20} color={colors.textMuted} />
                      )}
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={`font-sans-bold text-sm ${
                            isDone ? "text-primary line-through" : "text-ink"
                          }`}
                        >
                          Week {wk}: {title}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Calendar size={11} color={colors.textSecondary} />
                          <Text className="font-sans text-[11px] text-ink-muted">
                            {getWeekDate(wk)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className={`mt-1 font-sans text-xs leading-4.5 ${
                          isDone ? "text-ink-muted" : "text-ink-muted"
                        }`}
                      >
                        {desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default PlaybookDrawer;
