import React from "react";
import type { WeatherSummary } from "@/types/api";
import { WeatherHeroCard } from "@/components/ui/WeatherHeroCard";

type Props = {
  weather: WeatherSummary;
  variant?: "hero" | "detail";
};

export function WeatherWidget({ weather }: Props) {
  return (
    <WeatherHeroCard
      location={weather.location}
      dateStr="Today"
      tempC={weather.temp_c}
      condition={weather.condition}
      humidityPct={weather.rain_chance_pct > 0 ? 68 : 55}
      advisoryText={
        weather.rain_chance_pct > 40
          ? `Rain probability ${weather.rain_chance_pct}%. Monitor fields and postpone chemical spraying.`
          : `Favorable weather conditions today (${weather.condition}). Optimal for fieldwork.`
      }
      className="mb-3.5"
    />
  );
}

export default WeatherWidget;
