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
  if (!r || !r.available) return { label: "No risk data", tone: "warning" };
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

  // Yield display
  const yieldText = (() => {
    const y = crop.yield_result;
    if (!y || !y.available) return "–";
    if (y.lower_t_per_ha != null && y.upper_t_per_ha != null) {
      return `${y.lower_t_per_ha.toFixed(1)}–${y.upper_t_per_ha.toFixed(1)} t/ha`;
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
    <Card className={`border-l-4 ${borderColor}`}>
      {/* Header row */}
      <View className="mb-2 flex-row items-start justify-between">
        <View>
          <Text className="font-sans-extrabold text-base text-forest">
            {capitalize(crop.crop)}
          </Text>
          <Text className="text-xs text-ink-muted">
            {crop.area_acres.toFixed(2)} acres ({crop.percentage_of_total.toFixed(0)}%)
          </Text>
        </View>
        <Chip label={risk.label} tone={risk.tone} />
      </View>

      {/* Metrics grid */}
      <View className="flex-row flex-wrap gap-y-2">
        <Metric label="Yield" value={yieldText} />
        <Metric label="Water req." value={waterText} />
        <Metric label="Price" value={priceText} />
        <Metric label="Profit" value={profitText} />
      </View>

      {/* Reasons (first two) */}
      {crop.reasons.length > 0 && (
        <View className="mt-2 rounded-lg bg-green-pale px-2 py-1.5">
          {crop.reasons.slice(0, 2).map((r, i) => (
            <Text key={i} className="text-[11px] leading-4 text-ink-muted">
              • {r}
            </Text>
          ))}
        </View>
      )}

      {/* Warnings (if any) */}
      {crop.warnings.length > 0 && (
        <Text className="mt-1.5 text-[11px] italic text-warning">
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
