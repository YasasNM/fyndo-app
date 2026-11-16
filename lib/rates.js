"use client";
import { useEffect, useState } from "react";
import { CONFIG } from "./config";

// Live USD -> LKR rate for Tourist mode, from open.er-api.com (free, no key; shows their credit line).
// Cached for a day. Falls back to CONFIG.usdRate if the request fails.
export function useUsdRate() {
  const [r, setR] = useState({ rate: CONFIG.usdRate, live: false });
  useEffect(() => {
    let on = true;
    try {
      const hit = JSON.parse(localStorage.getItem("fyndo_usd_rate") || "null");
      if (hit && Date.now() - hit.at < 86400000) { setR({ rate: hit.rate, live: true }); return; }
    } catch {}
    fetch("https://open.er-api.com/v6/latest/USD").then((x) => x.json()).then((d) => {
      const rate = d && d.rates && Number(d.rates.LKR);
      if (!on || !rate) return;
      setR({ rate, live: true });
      try { localStorage.setItem("fyndo_usd_rate", JSON.stringify({ rate, at: Date.now() })); } catch {}
    }).catch(() => {});
    return () => { on = false; };
  }, []);
  return r;
}
