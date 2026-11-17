// Calls to Fyndo's server functions (/api/...). These hold the Google and AI keys.
import { db } from "./data";
import { askLocal } from "./askLocal";

async function get(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Something went wrong."); e.code = data.code || ""; e.status = res.status; throw e; }
  return data;
}

// When Google is out of quota, every visitor's browser stops asking for 10 minutes.
const DOWN_KEY = "fyndo_gdown";
const store = () => { try { return window.sessionStorage; } catch { return null; } };
export function googleDown() {
  const s = store(); if (!s) return false;
  const t = Number(s.getItem(DOWN_KEY) || 0);
  return t > Date.now();
}
function markGoogleDown() { const s = store(); try { s && s.setItem(DOWN_KEY, String(Date.now() + 10 * 60 * 1000)); } catch {} }

// Ask Fyndo: AI first, keyword backup if AI is off or busy.
export async function ask(q) {
  try {
    return await get("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
  } catch {
    return askLocal(q);
  }
}

// AI fine-tuning of a plan (picks among rule-approved places), and "Help me choose" on Compare.
const postJson = (path, body) => get(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const planAi = (body) => postJson("/api/plan-ai", body);
export const decide = (body) => postJson("/api/decide", body);

// Live Google details, remembered in this tab for 30 minutes.
export async function googlePlace(id, reviews = false) {
  const k = "fyndo_gp:" + id + (reviews ? ":r" : "");
  const s = store();
  try { const hit = s && JSON.parse(s.getItem(k) || "null"); if (hit && hit.t > Date.now() - 30 * 60 * 1000) return hit.v; } catch {}
  if (googleDown()) { const e = new Error("Google info is paused for a few minutes."); e.code = "quota"; throw e; }
  try {
    const v = await get(`/api/place?id=${encodeURIComponent(id)}${reviews ? "&reviews=1" : ""}`);
    try { s && s.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch {}
    return v;
  } catch (e) {
    if (e.code === "quota" || e.status === 429) markGoogleDown();
    throw e;
  }
}

export async function googleSearch(q) {
  const token = await db.authToken();
  return get(`/api/places-search?q=${encodeURIComponent(q)}`, { headers: token ? { Authorization: `Bearer ${token}`, "X-Fyndo-Token": token } : {} });
}

export const photoSrc = (name, w = 800) => `/api/photo?name=${encodeURIComponent(name)}&w=${w}`;

// Which server settings are present (true/false only).
export const health = () => get("/api/health");

// Admin: real photos of one place from OpenStreetMap, Wikimedia Commons and the place's own website.
export async function findPhotos(spot) {
  const token = await db.authToken();
  return get("/api/photo-finder", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}`, "X-Fyndo-Token": token } : {}) },
    body: JSON.stringify({ name: spot.name, lat: spot.lat, lng: spot.lng, website: spot.website || "", googlePlaceId: spot.google_place_id || "" }) });
}

// Admin: popular food and drink places in one area, from Google Places.
export async function discoverPlaces(area) {
  const token = await db.authToken();
  return get(`/api/places-discover?area=${encodeURIComponent(area)}`, { headers: token ? { Authorization: `Bearer ${token}`, "X-Fyndo-Token": token } : {} });
}
