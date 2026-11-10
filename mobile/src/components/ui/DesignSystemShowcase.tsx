import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import {
  Sprout,
  Sun,
  Droplets,
  TrendingUp,
  ScanLine,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Bell,
  Heart,
  Plus,
} from "lucide-react-native";

import {
  Card,
  DashboardCard,
  StatCard,
  SectionHeader,
  SectionTitle,
  AppButton,
  PrimaryButton,
  QuickActionCard,
  QuickActionsRow,
  Badge,
  StatusDot,
  Chip,
  WeatherHeroCard,
  WeatherDetailCard,
  CropCard,
  PriceTrendCard,
  ChartContainer,
  Skeleton,
  CardSkeleton,
  StatCardSkeleton,
  EmptyState,
  ErrorState,
  CircularIconButton,
  AppHeader,
  SearchBar,
  ResponsiveContainer,
  ResponsiveGrid,
  FormInput,
} from "./index";

import { colors, tokens } from "@/theme/tokens";
import { useResponsive } from "@/theme/responsive";

/**
 * Design System Showcase Component
 * Demonstrates all tokens and reusable components for visual verification across Web and Mobile.
 */
export function DesignSystemShowcase() {
  const { isDesktop, isTablet, breakpoint } = useResponsive();
  const [searchValue, setSearchValue] = useState("");
  const [selectedChip, setSelectedChip] = useState("Kharif");

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="py-6">
      <ResponsiveContainer>
        {/* Header / Intro */}
        <AppHeader
          title="KrishiMitra Design System"
          subtitle={`Breakpoint: ${breakpoint.toUpperCase()} (${isDesktop ? "Desktop" : isTablet ? "Tablet" : "Mobile"})`}
          showNotificationBell
          hasNotification
          className="mb-4"
        />

        {/* ── 1. Color Tokens Palette ── */}
        <SectionHeader title="Design Tokens" subtitle="Core color palette from design specification" />
        <View className="mb-4 flex-row flex-wrap gap-2.5">
          <View className="flex-1 min-w-[130px] rounded-xl p-3 bg-primary">
            <Text className="font-sans-bold text-xs text-white">Primary Green</Text>
            <Text className="font-sans text-[11px] text-white/80">#145C3A</Text>
          </View>
          <View className="flex-1 min-w-[130px] rounded-xl p-3 bg-sage border border-sage-dark">
            <Text className="font-sans-bold text-xs text-primary">Secondary Sage</Text>
            <Text className="font-sans text-[11px] text-primary/80">#E6F1E7</Text>
          </View>
          <View className="flex-1 min-w-[130px] rounded-xl p-3 bg-cream border border-cream-muted">
            <Text className="font-sans-bold text-xs text-ink">Background Cream</Text>
            <Text className="font-sans text-[11px] text-ink-muted">#F7F5EF</Text>
          </View>
          <View className="flex-1 min-w-[130px] rounded-xl p-3 bg-gold">
            <Text className="font-sans-bold text-xs text-ink">Accent Gold</Text>
            <Text className="font-sans text-[11px] text-ink/80">#E9B44C</Text>
          </View>
          <View className="flex-1 min-w-[130px] rounded-xl p-3 bg-white border border-[#183B2B]/[0.08]">
            <Text className="font-sans-bold text-xs text-ink">White Surface</Text>
            <Text className="font-sans text-[11px] text-ink-muted">#FFFFFF</Text>
          </View>
        </View>

        {/* ── 2. Search & Inputs ── */}
        <SectionHeader title="Search Bar & Controls" subtitle="Interactive search matching Dribbble reference" />
        <View className="mb-4">
          <SearchBar
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search crops, mandis, advisories..."
            onMicPress={() => {}}
            onClear={() => setSearchValue("")}
            className="mb-3"
          />
          <View className="flex-row items-center gap-2">
            {["Kharif", "Rabi", "Zaid", "High Yield", "Low Water"].map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selectedChip === item}
                onPress={() => setSelectedChip(item)}
              />
            ))}
          </View>
        </View>

        {/* ── 3. Weather Cards ── */}
        <SectionHeader title="Weather Cards" subtitle="Dark Hero Card & White Metric Card" />
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <WeatherHeroCard
            location="Mandya, Karnataka"
            dateStr="10 Nov 2026"
            tempC={32}
            condition="Cloudy"
            humidityPct={68}
            advisoryText="Optimal weather window today for soil preparation and irrigation."
          />
          <WeatherDetailCard
            location="Mandya APMC Zone"
            tempC={32}
            highC={34}
            lowC={22}
            condition="Partly Cloudy"
            humidityPct={68}
            precipitationMm={0}
            pressureHpa={1012}
            windSpeedKmh={14}
            sunrise="5:45 am"
            sunset="6:15 pm"
          />
        </ResponsiveGrid>

        {/* ── 4. Quick Actions ── */}
        <SectionHeader title="Quick Actions" subtitle="Invest by category / quick tasks" />
        <QuickActionsRow
          actions={[
            {
              id: "plan",
              label: "New Plan",
              subtitle: "AI Optimize",
              icon: <Sprout size={22} color={colors.primary} />,
              tone: "sage",
            },
            {
              id: "scan",
              label: "Scan Leaf",
              subtitle: "Disease AI",
              icon: <ScanLine size={22} color={colors.primary} />,
              tone: "gold",
            },
            {
              id: "mandi",
              label: "Mandi Rates",
              subtitle: "Live APMC",
              icon: <TrendingUp size={22} color={colors.primary} />,
              tone: "sage",
            },
            {
              id: "safety",
              label: "Risk Index",
              subtitle: "Monte Carlo",
              icon: <ShieldCheck size={22} color={colors.primary} />,
              tone: "white",
            },
          ]}
        />

        {/* ── 5. Stat Cards ── */}
        <SectionHeader title="Stat Cards" subtitle="Live agricultural indicators" />
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <StatCard
            label="Total Farm Land"
            value="5.0"
            unit="acres"
            subtext="Mandya · 100% utilized"
            icon={<Layers size={16} color={colors.primary} />}
            variant="default"
          />
          <StatCard
            label="Estimated Net Profit"
            value="₹1.85L"
            subtext="Kharif 2026"
            trend={{ value: "+14.2%", direction: "up" }}
            icon={<TrendingUp size={16} color={colors.primary} />}
            variant="sage"
          />
          <StatCard
            label="Water Budget"
            value="561"
            unit="mm"
            subtext="Sustainable aquifer level"
            trend={{ value: "Safe", direction: "up" }}
            icon={<Droplets size={16} color={colors.accent} />}
            variant="gold"
          />
        </ResponsiveGrid>

        {/* ── 6. Crop Cards ── */}
        <SectionHeader title="Crop Recommendation Cards" subtitle="Optimal crop allocations with risk & profit" />
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <CropCard
            cropName="Ragi (Finger Millet)"
            acres={2.5}
            percentage={50}
            expectedYield="3.2 t/ha"
            expectedPrice="₹3,400/q"
            profitRange="₹95k – ₹1.2L"
            waterMm={320}
            riskLevel="low"
            colorAccent="#145C3A"
          />
          <CropCard
            cropName="Maize (Corn)"
            acres={2.5}
            percentage={50}
            expectedYield="5.8 t/ha"
            expectedPrice="₹2,150/q"
            profitRange="₹80k – ₹1.05L"
            waterMm={460}
            riskLevel="medium"
            colorAccent="#E9B44C"
          />
        </ResponsiveGrid>

        {/* ── 7. Price Trend Cards ── */}
        <SectionHeader title="Price Trend Cards" subtitle="Mandi APMC real-time trends" />
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <PriceTrendCard
            crop="Ragi"
            mandi="Mandya APMC"
            priceInr={3450}
            changePct={2.8}
            updatedAt="Today · Live"
            trend7d={[3200, 3250, 3220, 3300, 3380, 3400, 3450]}
            isRecommended
          />
          <PriceTrendCard
            crop="Maize"
            mandi="Mysuru APMC"
            priceInr={2180}
            changePct={-1.2}
            updatedAt="Today · Live"
            trend7d={[2250, 2240, 2200, 2210, 2190, 2185, 2180]}
            isRecommended
          />
        </ResponsiveGrid>

        {/* ── 8. Buttons & Actions ── */}
        <SectionHeader title="Buttons & Actions" subtitle="Pill and rounded button variants" />
        <Card className="p-4">
          <View className="flex-row flex-wrap gap-3 mb-3">
            <AppButton
              label="+ Add New Note"
              variant="primary"
              size="md"
              fullWidth={false}
            />
            <AppButton
              label="Explore Mandi"
              variant="secondary"
              size="md"
              fullWidth={false}
            />
            <AppButton
              label="Share Plan"
              variant="outline"
              size="md"
              fullWidth={false}
            />
            <AppButton
              label="High Priority"
              variant="gold"
              size="md"
              fullWidth={false}
            />
          </View>
          <View className="flex-row items-center gap-3">
            <CircularIconButton
              icon={<ArrowRight size={16} color={colors.textPrimary} />}
              variant="white"
            />
            <CircularIconButton
              icon={<Bell size={16} color={colors.textPrimary} />}
              variant="white"
              hasNotificationDot
            />
            <CircularIconButton
              icon={<Plus size={16} color={colors.white} />}
              variant="primary"
            />
          </View>
        </Card>

        {/* ── 9. Badges & Status Indicators ── */}
        <SectionHeader title="Badges & Status Indicators" subtitle="Semantic tones" />
        <Card className="p-4">
          <View className="flex-row flex-wrap gap-2.5 mb-3">
            <Badge label="Low Risk" tone="success" dot />
            <Badge label="Medium Risk" tone="warning" dot />
            <Badge label="High Risk" tone="danger" dot />
            <Badge label="Optimal Season" tone="gold" />
            <Badge label="Verified APMC" tone="info" />
            <Badge label="Draft Plan" tone="neutral" />
          </View>
          <View className="flex-row items-center gap-3">
            <StatusDot tone="success" size={10} />
            <Text className="font-sans text-xs text-ink">Active Crop Cycle</Text>
            <StatusDot tone="warning" size={10} />
            <Text className="font-sans text-xs text-ink">Rain Expected</Text>
            <StatusDot tone="danger" size={10} />
            <Text className="font-sans text-xs text-ink">Pest Alert</Text>
          </View>
        </Card>

        {/* ── 10. Skeletons & States ── */}
        <SectionHeader title="Loading Skeletons & States" subtitle="Graceful loading, empty & error states" />
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <View>
            <Text className="font-sans-bold text-xs text-ink-muted mb-2">Card Skeleton</Text>
            <CardSkeleton />
          </View>
          <View>
            <Text className="font-sans-bold text-xs text-ink-muted mb-2">Stat Skeleton</Text>
            <StatCardSkeleton />
          </View>
        </ResponsiveGrid>

        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <EmptyState
            title="No Saved Plans Yet"
            description="Create your first AI-optimized crop plan by answering a few simple questions about your farm."
            actionLabel="Start New Analysis"
            onAction={() => {}}
          />
          <ErrorState
            title="Connection Interrupted"
            message="Unable to reach the agricultural intelligence server. Check your internet connection."
            onRetry={() => {}}
          />
        </ResponsiveGrid>
      </ResponsiveContainer>
    </ScrollView>
  );
}

export default DesignSystemShowcase;

