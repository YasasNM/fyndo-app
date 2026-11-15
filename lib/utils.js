export const lkr = (n) => "LKR " + Number(n || 0).toLocaleString("en-US");

export function priceLabel(s) {
  if (!s.price_max) return "Free";
  if (s.price_min === s.price_max) return lkr(s.price_min) + " pp";
  return `${lkr(s.price_min)} to ${Number(s.price_max).toLocaleString("en-US")} pp`;
}

export const avgPrice = (s) => Math.round(((s.price_min || 0) + (s.price_max || 0)) / 2);

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

// Is the spot open at a given time ("HH:MM")? Handles closing after midnight.
export function isOpenAt(s, t) {
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
