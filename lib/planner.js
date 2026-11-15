// The "Plan a Date" engine. Simple rules, no AI needed:
// it picks one spot per stop using mood tags, budget, area, open hours and distance.
import { avgPrice, isOpenAt, toMin, fromMin, km } from "./utils";

export const VIBES = [
  { id: "romantic", label: "Romantic & quiet", emoji: "🕯️", moods: ["Romantic", "Quiet", "Date night"],
    stops: [
      { label: "Tea or coffee", cats: ["Café"], mins: 60 },
      { label: "Dinner", cats: ["Restaurant"], mins: 90 },
      { label: "Dessert", cats: ["Dessert", "Café"], mins: 40 },
    ] },
  { id: "fun", label: "Fun & lively", emoji: "🎉", moods: ["Lively", "With friends", "Date night"],
    stops: [
      { label: "Something fun", cats: ["Activity"], mins: 75 },
      { label: "Dinner", cats: ["Restaurant", "Street Food"], mins: 75 },
      { label: "Dessert", cats: ["Dessert"], mins: 40 },
    ] },
  { id: "outdoor", label: "Outdoor & sunset", emoji: "🌅", moods: ["Outdoor", "Romantic"],
    stops: [
      { label: "Sunset walk", cats: ["Activity"], mins: 60 },
      { label: "Dinner", cats: ["Restaurant", "Street Food"], mins: 75 },
      { label: "Dessert", cats: ["Dessert"], mins: 40 },
    ] },
  { id: "chill", label: "Low-key & cheap", emoji: "🛋️", moods: ["Budget", "Cozy café", "Street food"],
    stops: [
      { label: "Coffee", cats: ["Café"], mins: 60 },
      { label: "Street food", cats: ["Street Food", "Restaurant"], mins: 60 },
    ] },
];

// Share of the total budget each stop is allowed to use.
const SHARE = { 2: [0.35, 0.65], 3: [0.2, 0.55, 0.25] };

function score(spot, ctx, slot, idx, prev) {
  if (!slot.cats.includes(spot.category)) return -Infinity;
  if (!isOpenAt(spot, ctx.time)) return -Infinity;
  if (ctx.used.has(spot.id)) return -Infinity;
  let s = 0;
  s += spot.moods.filter((m) => ctx.vibe.moods.includes(m)).length * 3;
  if (ctx.veg && spot.moods.includes("Veg friendly")) s += 3;
  if (spot.verified) s += 1;
  if (spot.hidden_gem) s += 1;
  // budget: cost for two vs this stop's share
  const cost = avgPrice(spot) * 2;
  const share = ctx.budget * SHARE[ctx.vibe.stops.length][idx];
  if (cost > share * 2) return -Infinity;
  if (cost > share) s -= 2;
  // area and distance
  if (ctx.area && spot.area === ctx.area) s += 5;
  if (prev && spot.lat && prev.lat) s -= Math.min(km(prev, spot), 15) * 1.2;
  return s;
}

export function candidatesFor(spots, ctx, idx, prev) {
  const slot = ctx.vibe.stops[idx];
  return spots
    .map((sp) => ({ sp, s: score(sp, ctx, slot, idx, prev) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.sp);
}

// opts: { vibe, budget, area, start ("HH:MM"), veg, skip: {stopIndex: [spotIds to skip]} }
export function buildPlan(spots, opts) {
  const vibe = VIBES.find((v) => v.id === opts.vibe) || VIBES[0];
  const used = new Set();
  let t = toMin(opts.start || "17:30");
  let prev = null;
  const stops = [];
  const shares = SHARE[vibe.stops.length];
  let spent = 0;
  vibe.stops.forEach((slot, idx) => {
    const ctx = { vibe, budget: opts.budget, area: opts.area, veg: opts.veg, used, time: fromMin(t) };
    const skip = (opts.skip && opts.skip[idx]) || [];
    const list = candidatesFor(spots, ctx, idx, prev).filter((s) => !skip.includes(s.id));
    // Keep the whole night inside the budget: leave enough for the stops still to come.
    const reserve = opts.budget * shares.slice(idx + 1).reduce((a, b) => a + b, 0) * 0.6;
    const room = opts.budget - spent - reserve;
    const fits = list.find((s) => avgPrice(s) * 2 <= room);
    const cheapest = [...list].sort((a, b) => avgPrice(a) - avgPrice(b))[0];
    const pick = fits || cheapest || null;
    stops.push({ label: slot.label, time: fromMin(t), spot: pick, alternatives: list.length - 1 });
    if (pick) { used.add(pick.id); prev = pick; spent += avgPrice(pick) * 2; }
    t += slot.mins + 15; // 15 minutes to travel between stops
  });
  const total = stops.reduce((a, s) => a + (s.spot ? avgPrice(s.spot) * 2 : 0), 0);
  return { vibe: vibe.id, vibeLabel: vibe.label, stops, total, area: opts.area || "Anywhere",
           date: opts.date, start: opts.start, budget: opts.budget };
}
