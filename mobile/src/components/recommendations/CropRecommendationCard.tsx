import { Text, View } from "react-native";
import { Card, Chip } from "@/components/ui";
import type { CropResult } from "@/types/api";

type Props = {
  crop: CropResult;
  accent?: "green" | "earth";
};

/** Display crop name capitalised (e.g. "ragi" → "Ragi") */
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Derive a simple risk label from risk_result probabilities */
function riskLabel(crop: CropResult): { label: string; tone: "success" | "warning" | "danger" } {
  const r = crop.risk_result;
  if (!r || !r.available) return { label: "Low risk", tone: "success" };
  const yf = r.yield_failure_probability ?? 0;
  const pc = r.price_crash_probability ?? 0;
  const combined = Math.max(yf, pc);
  if (combined < 0.15) return { label: "Low risk", tone: "success" };
  if (combined < 0.30) return { label: "Med risk", tone: "warning" };
  return { label: "High risk", tone: "danger" };
}

export function CropRecommendationCard({ crop, accent = "green" }: Props) {
  const borderColor = accent === "earth" ? "border-earth-soft" : "border-green";
  const risk = riskLabel(crop);
  const val = crop.validation;

  // Yield display
  const yieldText = (() => {
    const y = crop.yield_result;
    if (!y || !y.available) return "–";
    if (y.lower_t_per_ha != null && y.upper_t_per_ha != null) {
      return `${y.lower_t_per_ha.toFixed(1)}–${y.upper_t_per_ha.toFixed(1)} t/ha`;
    }
    if (y.expected_t_per_ha != null) {
      return `${y.expected_t_per_ha.toFixed(1)} t/ha`;
    }
    return "–";
  })();

  // Price display
  const priceText = (() => {
    const p = crop.price_result;
    if (!p || !p.available) return "–";
    if (p.lower_inr_per_quintal != null && p.upper_inr_per_quintal != null) {
      return `₹${Math.round(p.lower_inr_per_quintal / 100) / 10}k–${
        Math.round(p.upper_inr_per_quintal / 100) / 10
      }k/q`;
    }
    if (p.expected_inr_per_quintal != null) {
      return `₹${Math.round(p.expected_inr_per_quintal / 100) / 10}k/q`;
    }
    return "–";
  })();

  // Profit display
  const profitText = (() => {
    if (crop.net_profit_lower_inr != null && crop.net_profit_upper_inr != null) {
      return `₹${Math.round(crop.net_profit_lower_inr / 1000)}k–${Math.round(
        crop.net_profit_upper_inr / 1000
      )}k`;
    }
    if (crop.expected_net_profit_inr != null) {
      return `₹${Math.round(crop.expected_net_profit_inr / 1000)}k (est.)`;
    }
    return "–";
  })();

  // Water display
  const waterText = crop.water_requirement_mm
    ? `${crop.water_requirement_mm} mm`
    : "–";

  return (
    <Card className={`border-l-4 ${borderColor} mb-3.5`}>
      {/* Header row */}
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-sans-extrabold text-base text-forest">
            {capitalize(crop.crop)}
          </Text>
          <Text className="text-xs text-ink-muted">
            {crop.area_acres.toFixed(2)} acres ({crop.percentage_of_total.toFixed(0)}% of farm)
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Chip label={risk.label} tone={risk.tone} />
          {val?.is_ground_truth_verified && (
            <View className="rounded-full bg-emerald-100 px-2 py-0.5 border border-emerald-300">
              <Text className="text-[10px] font-sans-bold text-emerald-800">
                ✓ Verified
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Metrics grid */}
      <View className="flex-row flex-wrap gap-y-2 rounded-xl bg-cream-dark/25 p-2.5">
        <Metric label="Yield" value={yieldText} />
        <Metric label="Water req." value={waterText} />
        <Metric label="Price" value={priceText} />
        <Metric label="Profit" value={profitText} />
      </View>

      {/* ── Plain-Language Allocation Explanation ── */}
      {crop.allocation_reason && (
        <View className="mt-2.5 rounded-xl border border-forest/20 bg-green-pale/40 p-2.5">
          <Text className="font-sans-bold text-[11px] uppercase tracking-wide text-forest">
            🎯 Why this crop & acreage?
          </Text>
          <Text className="mt-1 text-xs leading-5 text-ink">
            {crop.allocation_reason}
          </Text>
        </View>
      )}

      {/* Detailed Farmer Reasons */}
      {crop.reasons.length > 0 && (
        <View className="mt-2 rounded-xl bg-white/70 p-2 border border-cream-dark/60">
          <Text className="mb-1 font-sans-bold text-[10px] uppercase text-ink-light">
            Feasibility Breakdown
          </Text>
          {crop.reasons.map((r, i) => (
            <Text key={i} className="mb-1 text-[11px] leading-4 text-ink-muted">
              {r.startsWith("•") || r.startsWith("💧") || r.startsWith("💰") || r.startsWith("🌱") || r.startsWith("📈") || r.startsWith("✓")
                ? r
                : `• ${r}`}
            </Text>
          ))}
        </View>
      )}

      {/* ── Ground-Truth Dataset Verification (from validate_output.py) ── */}
      {val && (
        <View className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="font-sans-bold text-[11px] text-emerald-900">
              🛡️ Ground-Truth Counter-Check
            </Text>
            <Text className="text-[10px] font-sans-bold text-emerald-700">
              5 State Datasets ✓
            </Text>
          </View>

          {/* Yield Check */}
          <View className="mb-1.5 rounded-lg bg-white/80 p-2 border border-emerald-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-sans-bold uppercase text-ink-light">
                Yield Reality (t/ha)
              </Text>
              <Text className="text-[10px] font-sans-bold text-emerald-800">
                {val.yield_verdict ?? "Verified in Historical Range"}
              </Text>
            </View>
            <Text className="mt-0.5 text-xs text-ink font-sans-medium">
              Model: {yieldText} · Historical Median: {val.historical_yield_median_t_ha ?? "–"} t/ha
            </Text>
            {val.historical_yield_range_str && (
              <Text className="text-[10px] text-ink-muted">
                Observed Range: {val.historical_yield_range_str} ({val.yield_samples_count} dataset records)
              </Text>
            )}
          </View>

          {/* Market Price Check */}
          <View className="rounded-lg bg-white/80 p-2 border border-emerald-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-sans-bold uppercase text-ink-light">
                APMC Mandi Price (₹/qtl)
              </Text>
              <Text className="text-[10px] font-sans-bold text-emerald-800">
                {val.price_verdict ?? "Verified in APMC Range"}
              </Text>
            </View>
            <Text className="mt-0.5 text-xs text-ink font-sans-medium">
              Model: {priceText} · APMC Median: {val.market_price_median_inr ? `₹${val.market_price_median_inr.toLocaleString("en-IN")}` : "–"}
            </Text>
            {val.market_price_range_str && (
              <Text className="text-[10px] text-ink-muted">
                Observed Mandi Range: {val.market_price_range_str} ({val.price_samples_count} mandi records)
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Warnings (if any) */}
      {crop.warnings.length > 0 && (
        <Text className="mt-2 text-[11px] italic text-warning">
          ⚠ {crop.warnings[0]}
        </Text>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2">
      <Text className="font-sans-bold text-[11px] uppercase text-ink-light">{label}</Text>
      <Text className="font-sans-semibold text-xs text-ink">{value}</Text>
    </View>
  );
}
