import React, { useEffect, useRef, useState } from "react";
import { View, Text, Platform, Pressable } from "react-native";
import { DISTRICTS } from "@/data/districtsData";
import { colors } from "@/theme/tokens";
import { Droplets, Wind, Sun, Moon, CloudMoon, CloudRain } from "lucide-react-native";

export interface LivingFieldProps {
  district?: string;
  season?: "kharif" | "rabi" | "summer";
  acres?: number;
  source?: "rainfed" | "borewell" | "canal";
  hp?: number;
  hours?: number;
  height?: number;
  interactive?: boolean;
  weatherCondition?: string;
  precipitationMm?: number;
  isNight?: boolean;
  tempC?: number;
}

const START = { kharif: 5, rabi: 9, summer: 1 };
const LEN = { kharif: 4, rabi: 5, summer: 4 };

function seasonRain(districtName: string = "Shivamogga", season: "kharif" | "rabi" | "summer" = "kharif"): number {
  const m = DISTRICTS[districtName]?.monthly;
  if (!m) return 450;
  let s = 0;
  for (let i = 0; i < LEN[season]; i++) {
    s += m[(START[season] + i) % 12];
  }
  return s;
}

export function LivingField({
  district = "Shivamogga",
  season = "kharif",
  acres = 4,
  source = "borewell",
  hp = 5,
  hours = 6,
  height = 200,
  interactive = true,
  weatherCondition = "Clear sky",
  precipitationMm = 0,
  isNight,
  tempC,
}: LivingFieldProps) {
  const rainMm = seasonRain(district, season);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const [clickCount, setClickCount] = useState(0);

  // Compute live day vs night state (consistently aligned with local time & weather API)
  const effectiveIsNight = isNight !== undefined ? isNight : (() => {
    const h = new Date().getHours();
    return h < 6 || h >= 18;
  })();

  // Live rain detection: ONLY rain when actual real-time weather reports precipitation!
  const isRaining = (precipitationMm != null && precipitationMm > 0.1) ||
    Boolean(weatherCondition && /rain|drizzle|shower|thunderstorm/i.test(weatherCondition));

  // Web Canvas implementation
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let h = (canvas.height = height);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 600;
      h = canvas.height = height;
    };
    window.addEventListener("resize", onResize);

    const INK = "#183B2B";
    const LEAF = "#145C3A";
    const LEAF2 = "#4A8062";
    const SOIL = "#EFE4D0";
    const SOIL2 = "#DECDB0";
    const GOLD = "#E9B44C";
    const CLAY = "#C0392B";
    const WATER = "#3A86A8";

    const state = {
      mx: -999,
      my: -999,
      wind: 0,
      lx: 0,
      blooms: [] as { x: number; y: number; r: number; a: number }[],
      seeds: [] as { x: number; y: number; vx: number; vy: number; l: number }[],
      birds: [] as { x: number; y: number; v: number; p: number; sc: number }[],
      rainDrops: [] as { x: number; y: number; v: number }[],
    };

    const wet = Math.min(1, rainMm / 700);

    // Initial birds (fly during day, sleep at night)
    if (!effectiveIsNight) {
      for (let i = 0; i < 6; i++) {
        state.birds.push({
          x: Math.random() * width,
          y: 12 + Math.random() * 24,
          v: 18 + Math.random() * 15,
          p: Math.random() * 6,
          sc: 0,
        });
      }
    }

    let startTime = performance.now();
    let lastTime = startTime;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      const t = (now - startTime) / 1000;
      lastTime = now;

      ctx.clearRect(0, 0, width, h);
      const hz = h * 0.42;
      const cx = width * 0.5;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, hz);
      ctx.clip();

      if (effectiveIsNight) {
        // ── Night Sky Gradient ──
        const nightSky = ctx.createLinearGradient(0, 0, 0, hz);
        nightSky.addColorStop(0, "#0A1710");
        nightSky.addColorStop(1, "#152C1E");
        ctx.fillStyle = nightSky;
        ctx.fillRect(0, 0, width, hz);

        // ── Twinkling Stars in Night Sky ──
        const starSeeds = [
          { x: 0.08, y: 0.20, s: 1.2, ph: 0.1 },
          { x: 0.22, y: 0.38, s: 1.4, ph: 1.4 },
          { x: 0.36, y: 0.16, s: 1.0, ph: 2.6 },
          { x: 0.49, y: 0.28, s: 1.5, ph: 3.3 },
          { x: 0.64, y: 0.19, s: 1.1, ph: 0.9 },
          { x: 0.76, y: 0.34, s: 1.6, ph: 2.0 },
          { x: 0.91, y: 0.14, s: 1.3, ph: 3.1 },
          { x: 0.15, y: 0.50, s: 0.9, ph: 4.0 },
        ];
        for (const st of starSeeds) {
          const alpha = 0.35 + 0.6 * Math.sin(t * 1.8 + st.ph);
          ctx.fillStyle = `rgba(240, 248, 240, ${alpha})`;
          ctx.beginPath();
          ctx.arc(st.x * width, st.y * hz, st.s, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Glowing Night Moon with Halo ──
        const moonR = Math.min(28, width * 0.07);
        const moonX = width * 0.82;
        const moonY = hz - moonR * 0.9;

        // Soft celestial glow halo
        const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 2.3);
        moonHalo.addColorStop(0, "rgba(244, 238, 220, 0.35)");
        moonHalo.addColorStop(1, "rgba(244, 238, 220, 0)");
        ctx.fillStyle = moonHalo;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 2.3, 0, Math.PI * 2);
        ctx.fill();

        // Moon disc
        ctx.fillStyle = "#F8F5EE";
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();

        // Subtle crater / crescent texture
        ctx.fillStyle = "rgba(18, 36, 26, 0.22)";
        ctx.beginPath();
        ctx.arc(moonX - moonR * 0.32, moonY - moonR * 0.1, moonR * 0.86, 0, Math.PI * 2);
        ctx.fill();

        // Soft night clouds
        const nClouds = isRaining ? 3 : 1;
        for (let i = 0; i < nClouds; i++) {
          const x = ((i * 220 + t * 8) % (width + 160)) - 80;
          const y = 14 + (i * 20) % (hz * 0.5);
          ctx.fillStyle = "rgba(40, 75, 55, 0.4)";
          ctx.beginPath();
          ctx.arc(x + 20, y + 15, 14, 0, Math.PI * 2);
          ctx.arc(x + 40, y + 10, 18, 0, Math.PI * 2);
          ctx.arc(x + 60, y + 15, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // ── Daytime Golden Sun ──
        const sunR = Math.min(36, width * 0.08) * (season === "summer" ? 1.3 : season === "rabi" ? 0.85 : 1);
        const sunX = width * 0.82;
        const sunY = hz - sunR * 0.8;

        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();

        // Sun rays
        ctx.strokeStyle = "rgba(233, 180, 76, 0.4)";
        ctx.lineWidth = 1;
        const rays = 24;
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2 + t * 0.08;
          const in1 = sunR + 4;
          const out = sunR + 14 + (i % 2 ? 8 : 0);
          ctx.beginPath();
          ctx.moveTo(sunX + Math.cos(a) * in1, sunY + Math.sin(a) * in1);
          ctx.lineTo(sunX + Math.cos(a) * out, sunY + Math.sin(a) * out);
          ctx.stroke();
        }

        // Clouds (proportional to weather condition: 0-1 for clear sky, more if overcast)
        const isClear = /clear|sunny/i.test(weatherCondition);
        const nClouds = isRaining ? 4 : isClear ? 1 : Math.round(wet * 3) + 1;
        for (let i = 0; i < nClouds; i++) {
          const x = ((i * 180 + t * (12 + i * 4)) % (width + 160)) - 80;
          const y = 14 + (i * 22) % (hz * 0.55);
          ctx.fillStyle = isRaining ? "rgba(215, 225, 230, 0.85)" : "rgba(255, 255, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(x + 20, y + 15, 14, 0, Math.PI * 2);
          ctx.arc(x + 40, y + 10, 18, 0, Math.PI * 2);
          ctx.arc(x + 60, y + 15, 12, 0, Math.PI * 2);
          ctx.fill();
        }

        // Daytime Birds
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        for (const b of state.birds) {
          const d = Math.hypot(b.x - state.mx, b.y - state.my);
          if (d < 100) b.sc = 1;
          b.sc = Math.max(0, b.sc - dt * 0.8);
          b.x += (b.v + b.sc * 140) * dt;
          b.y -= b.sc * 40 * dt;
          if (b.x > width + 20 || b.y < -10) {
            b.x = -20;
            b.y = 12 + Math.random() * 24;
            b.sc = 0;
          }
          const f = Math.sin(t * (7 + b.sc * 8) + b.p) * 4;
          ctx.beginPath();
          ctx.moveTo(b.x - 6, b.y - f);
          ctx.quadraticCurveTo(b.x - 2, b.y - 2, b.x, b.y);
          ctx.quadraticCurveTo(b.x + 2, b.y - 2, b.x + 6, b.y - f);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Far hills (illuminated soft silhouette at night)
      ctx.fillStyle = effectiveIsNight ? "#142B1F" : "#8AA68A";
      ctx.beginPath();
      ctx.moveTo(0, hz);
      for (let x = 0; x <= width; x += 15) {
        ctx.lineTo(x, hz - 12 - Math.sin(x * 0.012 + 1) * 10);
      }
      ctx.lineTo(width, hz);
      ctx.fill();

      // Soil ground with perspective furrows
      const rows = Math.max(16, Math.min(36, Math.round(16 + acres * 2)));
      const X = (u: number, y: number) => cx + u * width * 2.2 * ((y - hz) / (h - hz));

      const soilBaseColor = effectiveIsNight
        ? "#1E3226"
        : source === "rainfed" && wet < 0.35
        ? "#E5D8BC"
        : SOIL;
      const soilAltColor = effectiveIsNight ? "#18281E" : SOIL2;

      ctx.fillStyle = soilBaseColor;
      ctx.fillRect(0, hz, width, h - hz);

      ctx.fillStyle = soilAltColor;
      for (let i = -rows; i < rows; i += 2) {
        const a = i / rows;
        const b = (i + 1) / rows;
        ctx.beginPath();
        ctx.moveTo(X(a, hz + 0.1), hz);
        ctx.lineTo(X(a, h), h);
        ctx.lineTo(X(b, h), h);
        ctx.lineTo(X(b, hz + 0.1), hz);
        ctx.fill();
      }

      // Furrow lines
      ctx.strokeStyle = effectiveIsNight ? "rgba(240, 248, 240, 0.08)" : "rgba(24, 59, 43, 0.15)";
      ctx.lineWidth = 1;
      for (let i = -rows; i <= rows; i++) {
        const a = i / rows;
        ctx.beginPath();
        ctx.moveTo(cx, hz);
        ctx.lineTo(X(a, h), h);
        ctx.stroke();
      }

      // Water flowing in furrows
      if (source === "borewell") {
        ctx.strokeStyle = effectiveIsNight ? "#4B9CBF" : WATER;
        ctx.lineCap = "round";
        const flow = 0.08 + (hours || 6) * 0.02;
        for (let i = -rows + 1; i < rows; i += 2) {
          const a = (i + 0.5) / rows;
          for (let k = 0; k < 3; k++) {
            const d = (((t * flow + k / 3 + i * 0.05) % 1) + 1) % 1;
            const d2 = Math.min(1, d + 0.06);
            const y1 = hz + Math.pow(d, 2.1) * (h - hz);
            const y2 = hz + Math.pow(d2, 2.1) * (h - hz);
            ctx.lineWidth = 1 + d * 3;
            ctx.beginPath();
            ctx.moveTo(X(a, y1), y1);
            ctx.lineTo(X(a, y2), y2);
            ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
      } else if (source === "canal") {
        const y0 = hz + (h - hz) * 0.12;
        const y1 = hz + (h - hz) * 0.22;
        ctx.fillStyle = effectiveIsNight ? "#2D6882" : WATER;
        ctx.fillRect(0, y0, width, y1 - y0);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 20; i++) {
          const x = ((i * 50 + t * 30) % (width + 40)) - 20;
          const y = y0 + 3 + (i * 7) % (y1 - y0 - 6);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 18, y);
          ctx.stroke();
        }
      }

      // Plant crops swaying
      const depth = 8;
      for (let d = 0; d < depth; d++) {
        const dn = (d + 1) / depth;
        const y = hz + Math.pow(dn, 1.5) * (h - hz) * 0.96;
        const sc2 = Math.max(0.12, (y - hz) / (h - hz));
        const plantH = (12 + 45 * sc2) * (0.85 + (d % 3) * 0.1);
        const lean = Math.sin(t * 1.5 + d * 0.8) * (0.1 + (isRaining ? 0.08 : 0.04));

        ctx.fillStyle = effectiveIsNight
          ? d % 2 === 0 ? "#1C5336" : "#2A724A"
          : d % 2 === 0 ? LEAF : LEAF2;

        for (let i = -rows + 1; i < rows; i += 3) {
          const u = (i + 0.5) / rows;
          const px = X(u, y);
          if (px < -20 || px > width + 20) continue;

          ctx.beginPath();
          ctx.moveTo(px, y);
          ctx.quadraticCurveTo(
            px + lean * plantH * 0.4,
            y - plantH * 0.6,
            px + lean * plantH,
            y - plantH
          );
          ctx.lineTo(px + 2, y);
          ctx.fill();
        }
      }

      // Gentle floating fireflies over the furrows at night
      if (effectiveIsNight) {
        for (let i = 0; i < 6; i++) {
          const fx = (i * 95 + t * 14 + Math.sin(t * 1.2 + i * 2) * 25) % width;
          const fy = hz + 18 + ((i * 38 + Math.cos(t * 1.4 + i) * 16) % (h - hz - 35));
          const fa = 0.35 + 0.55 * Math.sin(t * 3.2 + i * 2.1);
          ctx.fillStyle = `rgba(233, 180, 76, ${fa})`;
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Click blooms (marigolds)
      for (let i = state.blooms.length - 1; i >= 0; i--) {
        const b = state.blooms[i];
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = CLAY;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── RAIN: ONLY active when real-time live weather indicates rain! ──
      if (isRaining) {
        ctx.strokeStyle = effectiveIsNight ? "rgba(110, 185, 225, 0.55)" : "rgba(58, 134, 168, 0.45)";
        ctx.lineWidth = 1;
        const nRain = Math.max(16, Math.min(50, Math.round(((precipitationMm || 2) * 8))));
        while (state.rainDrops.length < nRain) {
          state.rainDrops.push({
            x: Math.random() * width,
            y: Math.random() * h,
            v: 300 + Math.random() * 200,
          });
        }
        for (const drop of state.rainDrops) {
          drop.y += drop.v * dt;
          if (drop.y > h) {
            drop.y = -10;
            drop.x = Math.random() * width;
          }
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 2, drop.y + 8);
          ctx.stroke();
        }
      } else {
        // Clear all drops immediately when not raining
        if (state.rainDrops.length > 0) {
          state.rainDrops = [];
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mx = e.clientX - rect.left;
      state.my = e.clientY - rect.top;
    };

    const onClick = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y > h * 0.45) {
        state.blooms.push({ x, y, r: 5 + Math.random() * 4, a: 0 });
        if (state.blooms.length > 25) state.blooms.shift();
        setClickCount((c) => c + 1);
      }
    };

    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [district, season, acres, source, hp, hours, height, interactive, rainMm, isRaining, effectiveIsNight, weatherCondition]);

  return (
    <View
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[#F6F5F0] shadow-sm"
      style={{ height }}
    >
      {Platform.OS === "web" ? (
        <canvas
          ref={canvasRef as any}
          style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }}
        />
      ) : (
        /* Fallback for native devices */
        <View className="flex-1 items-center justify-center p-4 bg-[#EFE4D0]">
          <Text className="font-sans-bold text-sm text-primary">
            {district} Farm Landscape ({effectiveIsNight ? "Night" : "Day"})
          </Text>
          <Text className="font-sans text-xs text-ink-muted">
            {acres} Acres · {season.toUpperCase()} · {weatherCondition}
          </Text>
        </View>
      )}

      {/* Floating Real-time Weather & Day/Night Overlay Badge */}
      <View className="absolute top-2.5 right-3 flex-row items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 shadow-xs border border-primary/10 backdrop-blur-xs">
        {effectiveIsNight ? (
          <Moon size={12} color={colors.accent} />
        ) : isRaining ? (
          <CloudRain size={12} color={colors.info} />
        ) : (
          <Sun size={12} color={colors.accent} />
        )}
        <Text className="font-sans-bold text-[11px] text-ink uppercase">
          {district} · {effectiveIsNight ? "Night" : season}
        </Text>
        <Text className="font-sans text-[10px] text-ink-muted">
          {isRaining ? `${precipitationMm || 2} mm Rain` : weatherCondition || "Clear Sky"}
          {tempC != null ? ` · ${Math.round(tempC)}°C` : ""}
        </Text>
      </View>

      {/* Interactive Helper Hint */}
      {interactive && Platform.OS === "web" && (
        <View className="absolute bottom-2 left-3 rounded-md bg-white/75 px-2 py-0.5 pointer-events-none">
          <Text className="font-sans text-[9px] text-ink-muted">
            Click soil to plant marigolds · Move cursor to summon wind
          </Text>
        </View>
      )}
    </View>
  );
}

export default LivingField;
