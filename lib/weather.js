"use client";
import { useEffect, useState } from "react";

// Free weather from Open-Meteo (no key). Returns { raining, chance } for Colombo, or null.
export function useWeather() {
  const [w, setW] = useState(null);
  useEffect(() => {
    let on = true;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&current=precipitation&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FColombo")
      .then((r) => r.json())
      .then((d) => {
        if (!on || !d.current) return;
        const h = new Date().getHours();
        const next = (d.hourly.precipitation_probability || []).slice(h, h + 4);
        setW({ raining: d.current.precipitation > 0.2, chance: next.length ? Math.max(...next) : 0 });
      }).catch(() => {});
    return () => { on = false; };
  }, []);
  return w;
}
