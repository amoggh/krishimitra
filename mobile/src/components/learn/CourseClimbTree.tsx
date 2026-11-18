import React from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Rect, Line, G, Path, Circle, Text as SvgText } from "react-native-svg";
import { colors } from "@/theme/tokens";
import { LESSONS, type LessonItem } from "@/data/learnData";

export interface CourseClimbTreeProps {
  currentLessonIdx: number;
  completedIds: string[];
  onSelectLesson: (index: number) => void;
  width?: number;
  height?: number;
}

export function CourseClimbTree({
  currentLessonIdx,
  completedIds = [],
  onSelectLesson,
  width = 240,
  height = 420,
}: CourseClimbTreeProps) {
  const n = LESSONS.length;
  const base = 380;
  const top = 40;
  const getY = (i: number) => base - 40 - i * ((base - 40 - top) / (n - 1));
  const finishedRatio = completedIds.length / n;

  return (
    <View style={{ width, height }} className="items-center justify-center">
      <Svg viewBox="0 0 240 420" width="100%" height="100%">
        {/* Soil Base */}
        <Rect x={0} y={base} width={240} height={40} fill="#D6CBAE" />
        <Line x1={0} y1={base} x2={240} y2={base} stroke="#183B2B" strokeWidth={1.5} />

        {/* Roots */}
        <G stroke="#183B2B" strokeOpacity={0.6} strokeWidth={1} fill="none">
          {[-40, -20, 0, 20, 40].map((d) => (
            <Path
              key={d}
              d={`M120 ${base} Q${120 + d * 0.5} ${base + 18} ${120 + d} ${base + 35}`}
            />
          ))}
        </G>

        {/* Plant Stem Background Track */}
        <Path
          d={`M120 ${base} C105 300 135 220 120 140 S120 60 120 ${top}`}
          fill="none"
          stroke="#E6E0CE"
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Active Growing Stem */}
        <Path
          d={`M120 ${base} C105 300 135 220 120 140 S120 60 120 ${top}`}
          fill="none"
          stroke="#145C3A"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="380"
          strokeDashoffset={380 * (1 - Math.max(0.08, finishedRatio))}
        />

        {/* Full Completion Grain Head */}
        {finishedRatio >= 1 && (
          <G>
            {Array.from({ length: 14 }).map((_, i) => (
              <Circle
                key={i}
                cx={120 + Math.cos(i * 2.4) * (2 + i * 0.5)}
                cy={top - 12 - i * 1.8}
                r={3.5}
                fill={colors.accent}
                stroke="#183B2B"
                strokeWidth={0.8}
              />
            ))}
          </G>
        )}

        {/* Leaves for Each Lesson */}
        {LESSONS.map((L, i) => {
          const side = i % 2 ? 1 : -1;
          const yy = getY(i);
          const isDone = completedIds.includes(L.id);
          const isCurrent = currentLessonIdx === i;
          const tipX = 120 + side * 54;

          return (
            <G
              key={L.id}
              onPress={() => onSelectLesson(i)}
            >
              {/* Leaf Path */}
              <Path
                d={`M120 ${yy} Q${120 + side * 24} ${yy - 26} ${tipX} ${yy - 8} Q${
                  120 + side * 30
                } ${yy + 12} 120 ${yy} Z`}
                fill={isDone ? "#145C3A" : isCurrent ? "#E9B44C" : "#EFECE3"}
                stroke="#183B2B"
                strokeWidth={isCurrent ? 2 : 1.2}
              />

              {/* Leaf Node Pin */}
              {isCurrent && (
                <Circle cx={tipX} cy={yy - 8} r={4.5} fill="#C0392B" />
              )}

              {/* Lesson Number & Title */}
              <SvgText
                x={tipX + side * 10}
                y={yy - 4}
                textAnchor={side > 0 ? "start" : "end"}
                fontSize={10}
                fontFamily="Manrope, sans-serif"
                fontWeight="bold"
                fill={isCurrent ? "#183B2B" : "#718078"}
              >
                {L.n}
              </SvgText>

              <SvgText
                x={tipX + side * 10}
                y={yy + 8}
                textAnchor={side > 0 ? "start" : "end"}
                fontSize={9.5}
                fontFamily="Manrope, sans-serif"
                fontWeight={isCurrent ? "bold" : "normal"}
                fill="#183B2B"
              >
                {L.title.split(" ")[0]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export default CourseClimbTree;
