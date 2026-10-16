import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card, SectionTitle } from "@/components/ui";
import type { RejectedCrop } from "@/types/api";

type Props = {
  rejectedCrops: RejectedCrop[];
};

interface CategorizedGroup {
  id: string;
  title: string;
  icon: string;
  colorBorder: string;
  badgeBg: string;
  badgeText: string;
  pillBg: string;
  pillText: string;
  description: string;
  crops: RejectedCrop[];
}

function capitalize(s: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Categorize rejected crops into intuitive buckets for laypersons/farmers.
 */
function categorizeRejectedCrops(items: RejectedCrop[]): CategorizedGroup[] {
  const water: RejectedCrop[] = [];
  const season: RejectedCrop[] = [];
  const soil: RejectedCrop[] = [];
  const returnVsSelected: RejectedCrop[] = [];
  const other: RejectedCrop[] = [];

  for (const item of items) {
    const text = (item.reasons || []).join(" ").toLowerCase();

    if (
      text.includes("water") ||
      text.includes("irrigation") ||
      text.includes("mm") ||
      text.includes("borewell") ||
      text.includes("deficit")
    ) {
      water.push(item);
    } else if (
      text.includes("season") ||
      text.includes("kharif") ||
      text.includes("rabi") ||
      text.includes("summer") ||
      text.includes("zaid") ||
      text.includes("off-season") ||
      text.includes("monsoon")
    ) {
      season.push(item);
    } else if (
      text.includes("soil") ||
      text.includes("ph") ||
      text.includes("texture") ||
      text.includes("nitrogen") ||
      text.includes("salin") ||
      text.includes("district") ||
      text.includes("climate")
    ) {
      soil.push(item);
    } else if (
      text.includes("return") ||
      text.includes("profit") ||
      text.includes("economic") ||
      text.includes("passed compatibility") ||
      text.includes("not allocated") ||
      text.includes("margin")
    ) {
      returnVsSelected.push(item);
    } else {
      other.push(item);
    }
  }

  const groups: CategorizedGroup[] = [];

  if (water.length > 0) {
    groups.push({
      id: "water",
      title: "High Water Requirement",
      icon: "💧",
      colorBorder: "border-sky-300 bg-sky-50/60",
      badgeBg: "bg-sky-100 border border-sky-300",
      badgeText: "text-sky-900",
      pillBg: "bg-sky-100/90 border border-sky-200",
      pillText: "text-sky-900",
      description: "Needs more water than your pump and borewell can reliably supply.",
      crops: water,
    });
  }

  if (returnVsSelected.length > 0) {
    groups.push({
      id: "return",
      title: "Lower Return vs Selected Crops",
      icon: "📈",
      colorBorder: "border-emerald-300 bg-emerald-50/50",
      badgeBg: "bg-emerald-100 border border-emerald-300",
      badgeText: "text-emerald-900",
      pillBg: "bg-white border border-emerald-200",
      pillText: "text-emerald-950",
      description: "Passed basic agronomic checks, but chosen crops offer higher profit margins.",
      crops: returnVsSelected,
    });
  }

  if (season.length > 0) {
    groups.push({
      id: "season",
      title: "Season Mismatch",
      icon: "☀️",
      colorBorder: "border-amber-300 bg-amber-50/60",
      badgeBg: "bg-amber-100 border border-amber-300",
      badgeText: "text-amber-900",
      pillBg: "bg-amber-100/90 border border-amber-200",
      pillText: "text-amber-900",
      description: "Not suited for current season in your district.",
      crops: season,
    });
  }

  if (soil.length > 0) {
    groups.push({
      id: "soil",
      title: "Soil & Agro-Climatic Fit",
      icon: "🌱",
      colorBorder: "border-stone-300 bg-stone-50/60",
      badgeBg: "bg-stone-200/80 border border-stone-300",
      badgeText: "text-stone-900",
      pillBg: "bg-white border border-stone-200",
      pillText: "text-stone-900",
      description: "Soil properties or local temperature outside optimal range.",
      crops: soil,
    });
  }

  if (other.length > 0) {
    groups.push({
      id: "other",
      title: "Other Feasibility Limits",
      icon: "⚠️",
      colorBorder: "border-slate-300 bg-slate-50/60",
      badgeBg: "bg-slate-100 border border-slate-300",
      badgeText: "text-slate-900",
      pillBg: "bg-white border border-slate-200",
      pillText: "text-slate-900",
      description: "Excluded due to secondary farming constraints.",
      crops: other,
    });
  }

  return groups;
}

export function RejectedCropsSection({ rejectedCrops }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  if (!rejectedCrops || rejectedCrops.length === 0) {
    return null;
  }

  const groups = categorizeRejectedCrops(rejectedCrops);

  // Filter crops when detailed view is opened
  const filteredCrops =
    selectedFilter === "all"
      ? rejectedCrops
      : groups.find((g) => g.id === selectedFilter)?.crops || rejectedCrops;

  return (
    <View className="mb-4">
      <SectionTitle>Rejected crops ({rejectedCrops.length})</SectionTitle>

      {/* ── Summary / Gist Card ── */}
      <Card className="mb-2.5 border border-cream-dark bg-white">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-sans-bold text-xs uppercase tracking-wide text-ink-light">
            Quick Gist & Categories
          </Text>
          <View className="rounded-full bg-cream-dark/60 px-2.5 py-0.5">
            <Text className="text-[11px] font-sans-semibold text-ink-muted">
              {rejectedCrops.length} crops set aside
            </Text>
          </View>
        </View>

        <Text className="text-xs leading-4 text-ink-muted mb-3">
          To ensure maximum profit without risking borewell depletion, crops were categorized and filtered:
        </Text>

        {/* Category Cards */}
        <View className="gap-2.5">
          {groups.map((group) => (
            <View
              key={group.id}
              className={`rounded-xl border p-2.5 ${group.colorBorder}`}
            >
              {/* Category Header */}
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                  <Text className="text-sm">{group.icon}</Text>
                  <Text className="font-sans-bold text-xs text-ink">
                    {group.title}
                  </Text>
                </View>
                <View className={`rounded-full px-2 py-0.5 ${group.badgeBg}`}>
                  <Text className={`text-[10px] font-sans-bold ${group.badgeText}`}>
                    {group.crops.length} {group.crops.length === 1 ? "crop" : "crops"}
                  </Text>
                </View>
              </View>

              {/* Friendly Explanation */}
              <Text className="text-[11px] leading-4 text-ink-muted mb-2">
                {group.description}
              </Text>

              {/* Crop Badges */}
              <View className="flex-row flex-wrap gap-1.5">
                {group.crops.map((c) => (
                  <View
                    key={c.crop}
                    className={`rounded-md px-2 py-1 shadow-2xs ${group.pillBg}`}
                  >
                    <Text className={`text-[11px] font-sans-medium ${group.pillText}`}>
                      {capitalize(c.crop)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ── Toggle Details Button ── */}
        <Pressable
          onPress={() => setIsExpanded((prev) => !prev)}
          className="mt-3.5 flex-row items-center justify-center rounded-xl border border-forest/30 bg-green-pale/40 py-2.5 active:bg-green-pale"
        >
          <Text className="font-sans-bold text-xs text-forest">
            {isExpanded
              ? "▲ Hide detailed crop breakdown"
              : `▼ View details for all ${rejectedCrops.length} crops`}
          </Text>
        </Pressable>
      </Card>

      {/* ── Expanded Full Detailed View (Preserving existing layout) ── */}
      {isExpanded && (
        <View className="rounded-xl border border-cream-dark bg-white p-3.5">
          <View className="mb-3 flex-row items-center justify-between border-b border-cream-dark/60 pb-2">
            <Text className="font-sans-bold text-xs uppercase text-ink-light">
              Detailed Crop-by-Crop Reasons
            </Text>
            <Text className="text-[11px] text-ink-muted">
              Showing {filteredCrops.length} of {rejectedCrops.length}
            </Text>
          </View>

          {/* Quick Filter Tabs */}
          <View className="mb-3 flex-row flex-wrap gap-1.5">
            <Pressable
              onPress={() => setSelectedFilter("all")}
              className={`rounded-full px-2.5 py-1 ${
                selectedFilter === "all"
                  ? "bg-forest border border-forest"
                  : "bg-cream-dark/40 border border-cream-dark"
              }`}
            >
              <Text
                className={`text-[10px] font-sans-bold ${
                  selectedFilter === "all" ? "text-white" : "text-ink-muted"
                }`}
              >
                All ({rejectedCrops.length})
              </Text>
            </Pressable>

            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setSelectedFilter(g.id)}
                className={`rounded-full px-2.5 py-1 flex-row items-center gap-1 ${
                  selectedFilter === g.id
                    ? "bg-forest border border-forest"
                    : "bg-cream-dark/40 border border-cream-dark"
                }`}
              >
                <Text className="text-[10px]">{g.icon}</Text>
                <Text
                  className={`text-[10px] font-sans-bold ${
                    selectedFilter === g.id ? "text-white" : "text-ink-muted"
                  }`}
                >
                  {g.title.split(" ")[0]} ({g.crops.length})
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Crop List (Existing Layout) */}
          {filteredCrops.map((r, idx) => (
            <View
              key={r.crop}
              className={`py-2 ${
                idx < filteredCrops.length - 1
                  ? "border-b border-cream-dark/40"
                  : ""
              }`}
            >
              <Text className="font-sans-bold text-sm text-ink">
                {capitalize(r.crop)}
              </Text>
              {r.reasons.map((reason, i) => (
                <Text key={i} className="mt-0.5 text-xs leading-4 text-ink-muted">
                  • {reason}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
