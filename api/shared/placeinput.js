// Cleans the place details the app sends to the AI endpoints. Only public place facts pass through.
const { clean } = require("./util");

const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null; };
const strs = (a, n, len) => (Array.isArray(a) ? a : []).map((x) => clean(x, len)).filter(Boolean).slice(0, n);

function place(p) {
  if (!p || typeof p !== "object") return null;
  const id = clean(p.id, 120);
  const name = clean(p.name, 80);
  if (!id || !name) return null;
  return {
    id, name,
    area: clean(p.area, 40),
    category: clean(p.category, 30),
    pp: num(p.pp, 0, 100000),               // average spend per person, LKR
    open: /^\d\d:\d\d-\d\d:\d\d$/.test(p.open || "") ? p.open : "",
    open_now: typeof p.open_now === "boolean" ? p.open_now : undefined,
    moods: strs(p.moods, 8, 24),
    features: strs(p.features, 8, 30),
    rating: num(p.rating, 0, 5),
    reviews: num(p.reviews, 0, 100000),
    verified: p.verified === true,
    gem: p.gem === true,
    booking: clean(p.booking, 20),
    km: num(p.km, 0, 200),                  // distance from the previous stop, if known
  };
}

module.exports = { place, num };
