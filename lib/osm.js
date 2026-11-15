// FREE place data from OpenStreetMap (no key, no card):
//  - Nominatim: search a place by name
//  - Overpass: list restaurants/cafes near an area
// Used by Admin only (light, manual use, as the OSM usage policies ask).
// Data is (c) OpenStreetMap contributors, ODbL. The map credits OSM.

export const AREA_CENTERS = {
  "Colombo 3": [6.906, 79.853], "Colombo 4": [6.895, 79.856], "Colombo 5": [6.885, 79.864],
  "Colombo 7": [6.909, 79.862], Dehiwala: [6.851, 79.865], "Mount Lavinia": [6.83, 79.863],
};

const CAT = { restaurant: "Restaurant", cafe: "Café", fast_food: "Street Food", food_court: "Street Food",
  ice_cream: "Dessert", bakery: "Dessert", pub: "Restaurant", bar: "Restaurant" };

// "Mo-Su 09:00-22:00" -> { open_time, close_time } (first range found)
export function parseHours(h) {
  if (!h) return {};
  if (/24\/7/.test(h)) return { open_time: "00:00", close_time: "23:59" };
  const m = String(h).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return {};
  const p = (x) => String(x).padStart(2, "0");
  return { open_time: `${p(m[1])}:${m[2]}`, close_time: `${p(m[3])}:${m[4]}` };
}

function nearestArea(lat, lng) {
  let best = "", d = Infinity;
  Object.entries(AREA_CENTERS).forEach(([a, [la, ln]]) => {
    const x = (la - lat) ** 2 + (ln - lng) ** 2;
    if (x < d) { d = x; best = a; }
  });
  return d < 0.0009 ? best : ""; // roughly within 3 km of a known area
}

function toSpot({ name, lat, lng, tags = {}, address = "" }) {
  const cat = CAT[tags.amenity] || (tags.shop === "bakery" ? "Dessert" : "");
  const phone = (tags.phone || tags["contact:phone"] || "").replace(/[^\d+]/g, "");
  const bits = [tags.cuisine && `Cuisine: ${String(tags.cuisine).replace(/[;_]/g, ", ")}.`,
    tags.website || tags["contact:website"]].filter(Boolean);
  return {
    name, lat: Number(lat), lng: Number(lng), address,
    ...(cat ? { category: cat } : {}),
    area: nearestArea(Number(lat), Number(lng)),
    phone, about: bits.join(" "),
    ...parseHours(tags.opening_hours),
  };
}

async function json(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(res.status === 429 ? "Too many searches. Wait a few seconds." : "Map search is busy. Try again.");
  return res.json();
}

export async function osmSearch(q) {
  const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=lk&addressdetails=1&extratags=1&limit=8&q=" + encodeURIComponent(q);
  const rows = await json(u, { headers: { "Accept-Language": "en" } });
  return rows.map((r) => toSpot({ name: r.name || (r.display_name || "").split(",")[0], lat: r.lat, lng: r.lon,
    tags: { ...(r.extratags || {}), amenity: r.type === "restaurant" || r.type === "cafe" || r.type === "fast_food" || r.type === "ice_cream" ? r.type : (r.extratags || {}).amenity },
    address: r.display_name }));
}

export async function osmNearby(area, kinds = "restaurant|cafe|fast_food|ice_cream") {
  const [lat, lng] = AREA_CENTERS[area];
  const q = `[out:json][timeout:25];nwr["amenity"~"^(${kinds})$"]["name"](around:1500,${lat},${lng});out center 60;`;
  const data = await json("https://overpass-api.de/api/interpreter", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
  const seen = new Set();
  return (data.elements || [])
    .map((e) => toSpot({ name: e.tags.name, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, tags: e.tags }))
    .filter((s) => s.lat && s.lng && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()));
}
