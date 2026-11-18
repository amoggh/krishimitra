import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  BookOpen,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { ScreenContainer } from "@/components/ui";
import { LESSONS, LESSON_EXTRA, type LessonItem } from "@/data/learnData";
import { CourseClimbTree } from "@/components/learn/CourseClimbTree";
import { CropAtlas } from "@/components/learn/CropAtlas";
import { VideoShelf } from "@/components/learn/VideoShelf";
import { GlossarySection } from "@/components/learn/GlossarySection";
import {
  SoilRaceLab,
  WaterEfficiencyLab,
  YearWheelLab,
  SpacingLab,
  FeedingLab,
  ScoutingLab,
  DryingLab,
  SellingGameLab,
} from "@/components/learn/labs";

export function LearnScreen() {
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [activeTab, setActiveTab] = useState<"lessons" | "atlas" | "videos" | "glossary">("lessons");

  const currentLesson = LESSONS[activeLessonIdx] || LESSONS[0];
  const extra = LESSON_EXTRA[currentLesson.id] || { numbers: [], mistakes: [] };
  const isLessonCompleted = completedLessonIds.includes(currentLesson.id);

  // Check if all quiz questions for this lesson were answered correctly
  const allQuizCorrect = currentLesson.quiz.every(
    (q, i) => quizAnswers[i] === q.c
  );

  const handleAnswerQuiz = (questionIdx: number, optionIdx: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const handleCompleteLesson = () => {
    if (!completedLessonIds.includes(currentLesson.id)) {
      setCompletedLessonIds((prev) => [...prev, currentLesson.id]);
    }
    // Move to next lesson if available
    if (activeLessonIdx < LESSONS.length - 1) {
      setActiveLessonIdx((i) => i + 1);
      setQuizAnswers({});
    }
  };

  const renderActiveLab = () => {
    switch (currentLesson.id) {
      case "l1":
        return <SoilRaceLab />;
      case "l2":
        return <WaterEfficiencyLab />;
      case "l3":
        return <YearWheelLab />;
      case "l4":
        return <SpacingLab />;
      case "l5":
        return <FeedingLab />;
      case "l6":
        return <ScoutingLab />;
      case "l7":
        return <DryingLab />;
      case "l8":
        return <SellingGameLab />;
      default:
        return <SoilRaceLab />;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        {/* Header Banner */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-sans-extrabold text-2xl text-ink">
                Krishi Academy & Interactive Labs
              </Text>
              <Text className="text-xs text-ink-muted">
                Practical agronomy, irrigation physics, and mandi economics for first-time farmers
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full bg-sage px-3 py-1.5 border border-sage-dark/40">
              <Award size={14} color={colors.primary} />
              <Text className="font-sans-bold text-xs text-primary">
                {completedLessonIds.length} of {LESSONS.length} Leaves Grown
              </Text>
            </View>
          </View>
        </View>

        {/* Section Tabs */}
        <View className="mb-4 flex-row gap-2 border-b border-borderSubtle pb-2">
          {[
            ["lessons", "8 Course Lessons"],
            ["atlas", "14-Crop Atlas"],
            ["videos", "Tutorials & Notes"],
            ["glossary", "Glossary"],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key as any)}
              className={`rounded-full px-3.5 py-1.5 border transition-all ${
                activeTab === key
                  ? "bg-primary border-primary shadow-xs"
                  : "bg-white border-borderSubtle"
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  activeTab === key ? "text-white" : "text-ink"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "lessons" && (
          <View>
            {/* Top Container: Course Tree Progress & Lesson Navigation */}
            <View className="mb-4 flex-col lg:flex-row gap-4 items-center justify-between rounded-2xl bg-white p-4 border border-primary/20 shadow-xs">
              <View className="items-center justify-center">
                <CourseClimbTree
                  currentLessonIdx={activeLessonIdx}
                  completedIds={completedLessonIds}
                  onSelectLesson={(idx) => {
                    setActiveLessonIdx(idx);
                    setQuizAnswers({});
                  }}
                  width={220}
                  height={320}
                />
                <Text className="font-sans text-[10px] text-ink-muted text-center mt-1">
                  Click any leaf to switch lesson
                </Text>
              </View>

              {/* Lesson Overview & Quick Steps */}
              <View className="flex-1 w-full">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="rounded-full bg-sage px-2 py-0.5">
                    <Text className="font-sans-bold text-[10px] text-primary">
                      Lesson {currentLesson.n} of {LESSONS.length} · {currentLesson.min} Mins
                    </Text>
                  </View>
                  {isLessonCompleted && (
                    <View className="flex-row items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5">
                      <CheckCircle2 size={11} color={colors.forest} />
                      <Text className="font-sans-bold text-[10px] text-forest">
                        Completed
                      </Text>
                    </View>
                  )}
                </View>

                <Text className="font-sans-extrabold text-xl text-ink mb-1">
                  {currentLesson.title}
                </Text>
                <Text className="font-sans text-xs leading-5 text-ink-muted mb-3">
                  {currentLesson.lead}
                </Text>

                {/* 3 Key Numbers Row */}
                <View className="grid grid-cols-3 gap-2 rounded-xl bg-cream p-3 border border-borderSubtle mb-3">
                  {extra.numbers.map(([val, label]) => (
                    <View key={label}>
                      <Text className="font-sans-extrabold text-sm text-primary">
                        {val}
                      </Text>
                      <Text className="font-sans text-[10px] text-ink-muted" numberOfLines={2}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Stepper Buttons */}
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => {
                      setActiveLessonIdx((i) => Math.max(0, i - 1));
                      setQuizAnswers({});
                    }}
                    disabled={activeLessonIdx === 0}
                    className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 border ${
                      activeLessonIdx === 0
                        ? "opacity-30 border-borderSubtle bg-cream"
                        : "bg-white border-borderSubtle active:bg-cream"
                    }`}
                  >
                    <ChevronLeft size={14} color={colors.textPrimary} />
                    <Text className="font-sans-bold text-xs text-ink">Previous Lesson</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setActiveLessonIdx((i) => Math.min(LESSONS.length - 1, i + 1));
                      setQuizAnswers({});
                    }}
                    disabled={activeLessonIdx === LESSONS.length - 1}
                    className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 border ${
                      activeLessonIdx === LESSONS.length - 1
                        ? "opacity-30 border-borderSubtle bg-cream"
                        : "bg-primary border-primary active:bg-primary-dark"
                    }`}
                  >
                    <Text className="font-sans-bold text-xs text-white">Next Lesson</Text>
                    <ChevronRight size={14} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Active Interactive Lab */}
            <View className="mb-4">{renderActiveLab()}</View>

            {/* What to Know Points */}
            <View className="mb-4 rounded-2xl bg-white p-4 border border-primary/20 shadow-xs">
              <Text className="mb-2.5 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
                Key Agronomic Principles
              </Text>
              <View className="gap-2">
                {currentLesson.points.map((pt, idx) => (
                  <View key={idx} className="flex-row items-start gap-2">
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-sage mt-0.5">
                      <Text className="font-sans-bold text-[10px] text-primary">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="flex-1 font-sans text-xs leading-5 text-ink">
                      {pt}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Rookie Mistakes to Avoid */}
            <View className="mb-4 rounded-2xl bg-rose-50/70 p-4 border border-rose-200">
              <View className="mb-2 flex-row items-center gap-1.5">
                <AlertCircle size={15} color={colors.danger} />
                <Text className="font-sans-bold text-xs uppercase tracking-wider text-rose-900">
                  Common Rookie Mistakes
                </Text>
              </View>
              <View className="gap-1.5">
                {extra.mistakes.map((m, idx) => (
                  <View key={idx} className="flex-row items-start gap-2">
                    <Text className="font-sans-bold text-xs text-danger">•</Text>
                    <Text className="flex-1 font-sans text-xs leading-4.5 text-rose-950">
                      {m}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Do This Today Action Challenge */}
            <View className="mb-4 rounded-2xl bg-sage/60 p-4 border border-sage-dark/40">
              <Text className="font-sans-bold text-xs uppercase tracking-wider text-primary mb-1">
                Action Step for Today
              </Text>
              <Text className="font-sans text-xs leading-5 text-ink">
                {currentLesson.task}
              </Text>
            </View>

            {/* Check Yourself Quiz */}
            <View className="mb-4 rounded-2xl bg-white p-4 border border-primary/20 shadow-xs">
              <Text className="mb-3 font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
                Check Yourself: Knowledge Quiz
              </Text>
              <View className="gap-4">
                {currentLesson.quiz.map((q, qi) => (
                  <View key={qi} className="gap-2">
                    <Text className="font-sans-bold text-xs text-ink">
                      {qi + 1}. {q.q}
                    </Text>
                    <View className="gap-1.5">
                      {q.a.map((opt, oi) => {
                        const isSelected = quizAnswers[qi] === oi;
                        const isCorrect = q.c === oi;
                        const hasAnswered = quizAnswers[qi] !== undefined;

                        return (
                          <Pressable
                            key={oi}
                            onPress={() => handleAnswerQuiz(qi, oi)}
                            className={`rounded-xl px-3 py-2 border transition-all ${
                              hasAnswered && isSelected && isCorrect
                                ? "bg-emerald-100 border-emerald-400"
                                : hasAnswered && isSelected && !isCorrect
                                ? "bg-rose-100 border-rose-300"
                                : "bg-cream border-borderSubtle hover:bg-sand"
                            }`}
                          >
                            <Text
                              className={`font-sans text-xs ${
                                hasAnswered && isSelected && isCorrect
                                  ? "font-sans-bold text-emerald-900"
                                  : hasAnswered && isSelected && !isCorrect
                                  ? "font-sans-bold text-rose-900"
                                  : "text-ink"
                              }`}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>

              {/* Complete & Grow a Leaf Button */}
              <View className="mt-4 pt-3 border-t border-borderSubtle">
                <Pressable
                  onPress={handleCompleteLesson}
                  disabled={!allQuizCorrect && !isLessonCompleted}
                  className={`rounded-full py-3 items-center shadow-xs transition-all ${
                    isLessonCompleted
                      ? "bg-sage border border-primary"
                      : allQuizCorrect
                      ? "bg-primary active:bg-primary-dark"
                      : "bg-cream border border-borderSubtle opacity-60"
                  }`}
                >
                  <Text
                    className={`font-sans-bold text-xs ${
                      isLessonCompleted
                        ? "text-primary"
                        : allQuizCorrect
                        ? "text-white"
                        : "text-ink-muted"
                    }`}
                  >
                    {isLessonCompleted
                      ? "✓ Lesson Completed (Click to Proceed)"
                      : allQuizCorrect
                      ? "Complete Lesson & Grow a Leaf →"
                      : "Answer the quiz correctly to complete"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {activeTab === "atlas" && <CropAtlas />}
        {activeTab === "videos" && <VideoShelf />}
        {activeTab === "glossary" && <GlossarySection />}
      </ScrollView>
    </ScreenContainer>
  );
}

export default LearnScreen;
