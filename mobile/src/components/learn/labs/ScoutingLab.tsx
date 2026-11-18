import React, { useState, useMemo, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "@/theme/tokens";
import { Footprints, AlertCircle, CheckCircle2 } from "lucide-react-native";

const COLS = 14;
const ROWS = 8;

export function ScoutingLab() {
  const [round, setRound] = useState(1);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<boolean | null>(null);

  const fieldData = useMemo(() => {
    const rate = [0.04, 0.22, 0.06, 0.18, 0.03, 0.26][round % 6];
    const cells = Array.from(
      { length: COLS * ROWS },
      (_, i) => Math.abs(Math.sin(i * 91.7 + round * 37.1)) % 1 < rate
    );
    // Standard W-walk path sampling 20 plants
    const path: [number, number][] = Array.from({ length: 20 }, (_, i) => {
      const q = (i / 19) * 4;
      const tri = q % 2 < 1 ? q % 2 : 2 - (q % 2);
      return [
        Math.round((i / 19) * (COLS - 1)),
        Math.round(tri * (ROWS - 1)),
      ];
    });
    const infestedCount = cells.filter(Boolean).length;
    return {
      cells,
      path,
      truthPct: (infestedCount / cells.length) * 100,
    };
  }, [round]);

  const idx = (c: number, r: number) => r * COLS + c;
  const sampled = fieldData.path.slice(0, step);
  const hits = sampled.filter(([c, r]) => fieldData.cells[idx(c, r)]).length;
  const samplePct = step > 0 ? (hits / step) * 100 : 0;
  const isDone = step >= 20;
  const shouldSpray = fieldData.truthPct >= 10;

  useEffect(() => {
    if (step === 0 || step >= 20) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 180);
    return () => clearTimeout(timer);
  }, [step]);

  const resetField = () => {
    setRound((r) => r + 1);
    setStep(0);
    setChoice(null);
  };

  return (
    <View className="rounded-2xl border border-primary/20 bg-white p-4 shadow-xs">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-ink-muted">
          Lab 6: Integrated Pest Management (IPM)
        </Text>
        <Text className="font-sans-bold text-xs text-primary">
          20-Plant W-Walk Scouting
        </Text>
      </View>

      {/* Field Grid Visualization */}
      <View className="mb-3 overflow-hidden rounded-xl bg-[#E8E1D3] p-2.5 border border-borderSubtle">
        <View className="flex-col gap-1">
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={r} className="flex-row justify-between">
              {Array.from({ length: COLS }).map((_, c) => {
                const isInfested = fieldData.cells[idx(c, r)];
                const isSampled = sampled.some(([a, b]) => a === c && b === r);
                const revealAll = choice !== null;

                return (
                  <View
                    key={`${c}-${r}`}
                    className={`h-3.5 w-3.5 rounded-full items-center justify-center transition-all ${
                      (isSampled || revealAll) && isInfested
                        ? "bg-[#C0392B]"
                        : isSampled
                        ? "bg-emerald-600 ring-1 ring-white"
                        : "bg-[#145C3A]/40"
                    }`}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Sampling Counters */}
      <View className="grid grid-cols-4 gap-2 rounded-xl bg-cream p-3 border border-borderSubtle mb-3">
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Plants Checked</Text>
          <Text className="font-sans-extrabold text-sm text-ink">{step} / 20</Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Damaged</Text>
          <Text className="font-sans-extrabold text-sm text-danger">{hits}</Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Sample Rate</Text>
          <Text className="font-sans-extrabold text-sm text-ink">
            {samplePct.toFixed(0)}%
          </Text>
        </View>
        <View>
          <Text className="font-sans text-[10px] text-ink-muted">Threshold (ETL)</Text>
          <Text className="font-sans-extrabold text-sm text-forest">10%</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center gap-2 mb-3">
        {step === 0 && (
          <Pressable
            onPress={() => setStep(1)}
            className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2 active:bg-primary-dark shadow-2xs"
          >
            <Footprints size={15} color={colors.white} />
            <Text className="font-sans-bold text-xs text-white">
              Start W-Pattern Walk
            </Text>
          </Pressable>
        )}

        {isDone && choice === null && (
          <>
            <Pressable
              onPress={() => setChoice(true)}
              className="flex-1 rounded-xl bg-primary py-2.5 items-center active:bg-primary-dark shadow-2xs"
            >
              <Text className="font-sans-bold text-xs text-white">
                Spray Pesticide (Over ETL)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setChoice(false)}
              className="flex-1 rounded-xl bg-white border border-primary py-2.5 items-center active:bg-cream"
            >
              <Text className="font-sans-bold text-xs text-primary">
                Do Not Spray (Under ETL)
              </Text>
            </Pressable>
          </>
        )}

        {choice !== null && (
          <Pressable
            onPress={resetField}
            className="rounded-full bg-white border border-borderSubtle px-4 py-1.5 active:bg-cream"
          >
            <Text className="font-sans-bold text-xs text-ink">
              Try Another Field
            </Text>
          </Pressable>
        )}
      </View>

      {/* Verdict Assessment */}
      {choice !== null && (
        <View
          className={`rounded-xl p-3 border ${
            choice === shouldSpray
              ? "bg-emerald-50 border-emerald-300"
              : "bg-rose-50 border-rose-300"
          }`}
        >
          <Text
            className={`font-sans-bold text-xs ${
              choice === shouldSpray ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            {choice === shouldSpray
              ? "✓ Correct Decision!"
              : choice
              ? "⚠ Spray Was Not Needed (Waste of Money)"
              : "⚠ Pest Spread Beyond Economic Damage Threshold"}
          </Text>
          <Text className="mt-1 font-sans text-xs text-ink-muted">
            True whole-field infestation was {fieldData.truthPct.toFixed(0)}% (ETL: 10%).
            Walking 20 plants in a W gets an accurate verdict in 5 minutes without checking all {COLS * ROWS} plants.
          </Text>
        </View>
      )}
    </View>
  );
}

export default ScoutingLab;
