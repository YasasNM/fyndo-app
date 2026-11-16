"use client";
import { useEffect, useState } from "react";

// Sunset times for Colombo for the next week, from Open-Meteo (free, no key). Cached for a day.
// Returns { "2026-11-16": "17:49", ... } or {} while loading / if it fails.
export function useSunsets() {
  const [m, setM] = useState({});
  useEffect(() => {
    let on = true;
    try {
      const hit = JSON.parse(localStorage.getItem("fyndo_sunsets") || "null");
      if (hit && hit.day === new Date().toISOString().slice(0, 10)) { setM(hit.map); return; }
    } catch {}
    fetch("https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&daily=sunset&forecast_days=8&timezone=Asia%2FColombo")
      .then((r) => r.json()).then((d) => {
        if (!on || !d.daily) return;
        const map = {};
        d.daily.time.forEach((day, i) => { map[day] = String(d.daily.sunset[i]).slice(11, 16); });
        setM(map);
        try { localStorage.setItem("fyndo_sunsets", JSON.stringify({ day: new Date().toISOString().slice(0, 10), map })); } catch {}
      }).catch(() => {});
    return () => { on = false; };
  }, []);
  return m;
}
