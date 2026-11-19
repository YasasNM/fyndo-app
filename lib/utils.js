import { publicPricesFor } from "./publicPrices";

export const lkr = (n) => "LKR " + Number(n || 0).toLocaleString("en-US");

// Typical LKR per person, used only to plan when a place has no prices yet.
const TYPICAL = { Restaurant: 2000, "Café": 1000, "Street Food": 600, Dessert: 700, Activity: 0 };
export const priceKnown = (s) => Boolean(s.price_max) || s.category === "Activity";

export const areaOptions = (defaults, spots) => [...new Set([...defaults, ...(spots || []).map((s) => s.area)].filter((a) => typeof a === "string" && a.trim()))];

export function priceLabel(s) {
  if (!s.price_max) {
    if (s.category === "Activity") return "Free";
    const spend = publicPricesFor(s)?.spend;
    if (spend) return `Reported ${spend.min === spend.max ? lkr(spend.min) : `${lkr(spend.min)} to ${Number(spend.max).toLocaleString("en-US")}`} pp (estimate)`;
    return "Prices not added yet";
  }
  if (s.price_min === s.price_max) return lkr(s.price_min) + " pp";
  return `${lkr(s.price_min)} to ${Number(s.price_max).toLocaleString("en-US")} pp`;
}

export const avgPrice = (s) => {
  if (s.price_max) return Math.round(((s.price_min || 0) + s.price_max) / 2);
  const spend = s.category !== "Activity" && publicPricesFor(s)?.spend;
  return spend ? Math.round((spend.min + spend.max) / 2) : TYPICAL[s.category] || 0;
};

export const toMin = (t) => {
  const [h, m] = String(t || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};
export const fromMin = (m) => {
  m = ((m % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};
export function niceTime(t) {
  const m = toMin(t);
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Is the spot open at a given time ("HH:MM")? Null means hours are unknown.
// Accept database TIME values with seconds, overnight hours and a 24:00 endpoint.
export function isOpenAt(s, t) {
  const valid = (v) => typeof v === "string" && /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$|^24:00(?::00)?$/.test(v);
  if (![s.open_time, s.close_time, t].every(valid)) return null;
  const o = toMin(s.open_time), c = toMin(s.close_time), x = toMin(t);
  if (c > o) return x >= o && x < c;
  return x >= o || x < c;
}

export function bookingSlots(s) {
  const out = [];
  const step = s.slot_minutes || 30;
  for (let m = toMin(s.booking_start); m <= toMin(s.booking_end); m += step) out.push(fromMin(m));
  return out;
}

export function nextDays(n = 7) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push({
      iso: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`,
      day: x.toLocaleDateString("en-US", { weekday: "short" }),
      num: x.getDate(),
      label: x.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return out;
}

export const todayIso = () => nextDays(1)[0].iso;

export function km(a, b) {
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const mapsUrl = (s) =>
  s.lat ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.area)}`;

export const waUrl = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
export const shareWa = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

// Opens the phone's share sheet when available; otherwise falls back to WhatsApp.
export async function shareNow({ title, text, url }) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title, text, url }); return "shared"; }
  } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  window.open(shareWa(url ? `${text} ${url}` : text), "_blank", "noopener");
  return "whatsapp";
}

// Turns a TikTok / YouTube / Instagram link into an embeddable URL.
export function embedUrl(url) {
  if (!url) return null;
  let m;
  if ((m = url.match(/tiktok\.com\/.*video\/(\d+)/))) return `https://www.tiktok.com/embed/v2/${m[1]}`;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)))
    return `https://www.youtube.com/embed/${m[1]}`;
  if ((m = url.match(/instagram\.com\/(?:reel|p)\/([\w-]+)/))) return `https://www.instagram.com/reel/${m[1]}/embed`;
  return null;
}

export const refCode = () => "FY-" + Math.floor(1000 + Math.random() * 9000);

export const STATUS_LABEL = {
  requested: "Waiting for reply", confirmed: "Confirmed", declined: "Declined",
  cancelled: "Cancelled", arrived: "Arrived", no_show: "No-show",
};

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);

// ---- menu items: "Item | Price | veg, spicy2, star" <-> { item, price, tags: [] } ----
export function parseMenu(text) {
  return String(text || "").split("\n").map((l) => l.split("|")).filter((p) => p[0].trim()).map((p) => {
    const tags = (p[2] || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    return { item: p[0].trim(), price: Number((p[1] || "0").replace(/[^0-9]/g, "")), ...(tags.length ? { tags } : {}) };
  });
}
export const menuToText = (menu) =>
  (menu || []).map((m) => `${m.item} | ${m.price}${m.tags && m.tags.length ? " | " + m.tags.join(", ") : ""}`).join("\n");

// Rough bill: subtotal + service charge, then VAT on top. An estimate only.
export function billEstimate(subtotal, { serviceCharge = 0.1, vat = 0.18 } = {}) {
  const sc = Math.round(subtotal * serviceCharge);
  const v = Math.round((subtotal + sc) * vat);
  return { subtotal, sc, vat: v, total: subtotal + sc + v };
}

// One friendly line on WHY a place suits this search/plan. Rules only, no AI needed.
export function whyThis(spot, { moods = [], budget = 0, rating, area = "", feature = "" } = {}) {
  const bits = [];
  const hit = (spot.moods || []).filter((m) => moods.includes(m));
  if (hit.length) bits.push(hit.slice(0, 2).join(" and ").toLowerCase());
  if (area && spot.area === area) bits.push(`in ${area}`);
  if (budget && priceKnown(spot) && avgPrice(spot) * 2 <= budget) bits.push("fits your budget");
  if (rating && rating.count >= 1 && rating.avg >= 4) bits.push(`rated ${rating.avg.toFixed(1)} by Fyndo users`);
  if (spot.hidden_gem) bits.push("a hidden gem");
  if (spot.verified) bits.push("checked by Fyndo");
  if (feature) bits.push(feature);
  return bits.length ? "Why: " + bits.slice(0, 3).join(", ") : "";
}

export const usd = (lkr, rate = 300) => "$" + (Number(lkr || 0) / rate).toFixed(2);
