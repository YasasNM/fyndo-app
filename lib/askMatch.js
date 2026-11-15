// Turns Ask Fyndo filters into results using ONLY real Fyndo spots.
import { avgPrice, isOpenAt, nextDays } from "./utils";
import { buildPlan } from "./planner";

export function matchSpots(spots, f) {
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const scored = spots.map((s) => {
    if (f.categories.length && !f.categories.includes(s.category)) return null;
    if (f.max_price_per_person && avgPrice(s) > f.max_price_per_person) return null;
    if (f.open_now && !isOpenAt(s, t)) return null;
    if (f.veg && !s.moods.includes("Veg friendly")) return null;
    const hay = [s.name, s.about, s.category, ...(s.menu || []).map((m) => m.item)].join(" ").toLowerCase();
    if (f.keywords.length && !f.keywords.some((k) => hay.includes(k))) return null;
    let score = s.moods.filter((m) => f.moods.includes(m)).length * 2;
    if (f.area) score += s.area === f.area ? 4 : -2;
    if (s.verified) score += 1;
    return { s, score };
  }).filter(Boolean);
  return scored.sort((a, b) => b.score - a.score).slice(0, 8).map((x) => x.s);
}

export function planFromAsk(spots, f) {
  const days = nextDays(7);
  const opts = {
    vibe: f.vibe || "romantic",
    budget: f.budget_for_two || 6000,
    area: f.area || "",
    start: f.start_time && f.start_time >= "15:00" && f.start_time <= "20:30" ? f.start_time : "17:30",
    date: days[f.day_offset || 0].iso,
    veg: !!f.veg,
  };
  return { opts, plan: buildPlan(spots, opts) };
}

export const planLink = (o) =>
  `/plan/?vibe=${o.vibe}&budget=${o.budget}&area=${encodeURIComponent(o.area)}&start=${o.start}&date=${o.date}${o.veg ? "&veg=1" : ""}`;
