// Fyndo Rewards: points, tiers, badges and streaks. All worked out from a person's own check-ins.
export const TIERS = [
  { id: "explorer", label: "Explorer", min: 0, emoji: "🧭", perk: "Earn points at every partner place" },
  { id: "foodie", label: "Foodie", min: 100, emoji: "🍜", perk: "Early look at new places" },
  { id: "insider", label: "Insider", min: 300, emoji: "🎟️", perk: "Priority in group plans and new collections" },
  { id: "legend", label: "Legend", min: 700, emoji: "👑", perk: "Top badge and first pick of Fyndo events" },
];

export function pointsOf(checkins, reviewCount = 0) {
  return checkins.reduce((a, c) => a + (c.points || 0), 0) + Math.min(reviewCount, 20) * 5;
}

export function tierOf(points) {
  let i = 0;
  TIERS.forEach((t, k) => { if (points >= t.min) i = k; });
  const cur = TIERS[i], next = TIERS[i + 1] || null;
  return { cur, next, toNext: next ? next.min - points : 0,
    pct: next ? Math.round(((points - cur.min) / (next.min - cur.min)) * 100) : 100 };
}

// Stamp card for one spot: visits so far and how many until the free reward.
export function stampsFor(visits, goal = 6) {
  const g = Math.max(2, goal || 6);
  const done = visits % g;
  return { goal: g, done, rewards: Math.floor(visits / g), left: g - done };
}

const weekIndex = (iso) => Math.floor((new Date(iso + "T00:00:00Z").getTime() / 86400000 + 3) / 7); // Monday-based
export function streakWeeks(checkins) {
  const weeks = [...new Set(checkins.map((c) => weekIndex(c.day)))].sort((a, b) => b - a);
  if (!weeks.length) return 0;
  const now = weekIndex(new Date().toISOString().slice(0, 10));
  if (weeks[0] < now - 1) return 0; // a week with no visit breaks the streak
  let n = 1;
  for (let i = 1; i < weeks.length; i++) { if (weeks[i] === weeks[i - 1] - 1) n++; else break; }
  return n;
}

const distinct = (list) => new Set(list.map((x) => x.spot_id)).size;
// checkins need a joined `spot` object: { id, category, area, moods, hidden_gem }
export const BADGES = [
  { id: "first", emoji: "🎉", label: "First check-in", hint: "Check in at any place", test: (c) => c.length >= 1 },
  { id: "ten", emoji: "🧭", label: "Explorer", hint: "Visit 10 different places", test: (c) => distinct(c) >= 10 },
  { id: "street", emoji: "🔥", label: "Street food hunter", hint: "Visit 5 street food spots",
    test: (c) => distinct(c.filter((x) => x.spot && x.spot.category === "Street Food")) >= 5 },
  { id: "cafe", emoji: "☕", label: "Café regular", hint: "Visit 5 cafés",
    test: (c) => distinct(c.filter((x) => x.spot && x.spot.category === "Café")) >= 5 },
  { id: "gem", emoji: "💎", label: "Hidden gem hunter", hint: "Visit 3 hidden gems",
    test: (c) => distinct(c.filter((x) => x.spot && x.spot.hidden_gem)) >= 3 },
  { id: "date", emoji: "💞", label: "Date night pro", hint: "Visit 3 romantic or date-night spots",
    test: (c) => distinct(c.filter((x) => x.spot && (x.spot.moods || []).some((m) => m === "Date night" || m === "Romantic"))) >= 3 },
  { id: "regular", emoji: "🏠", label: "Regular", hint: "Visit the same place 5 times",
    test: (c) => { const n = {}; c.forEach((x) => (n[x.spot_id] = (n[x.spot_id] || 0) + 1)); return Object.values(n).some((v) => v >= 5); } },
  { id: "area", emoji: "📍", label: "Area local", hint: "5 visits in one area",
    test: (c) => { const n = {}; c.forEach((x) => x.spot && (n[x.spot.area] = (n[x.spot.area] || 0) + 1)); return Object.values(n).some((v) => v >= 5); } },
];
export const badgesOf = (checkins) => BADGES.map((b) => ({ ...b, got: b.test(checkins) }));
