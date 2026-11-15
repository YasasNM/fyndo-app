// Calls to Fyndo's server functions (/api/...). These hold the Google and AI keys.
import { db } from "./data";
import { askLocal } from "./askLocal";

async function get(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// Ask Fyndo: AI first, keyword backup if AI is off or busy.
export async function ask(q) {
  try {
    return await get("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
  } catch {
    return askLocal(q);
  }
}

export const googlePlace = (id, reviews = false) =>
  get(`/api/place?id=${encodeURIComponent(id)}${reviews ? "&reviews=1" : ""}`);

export async function googleSearch(q) {
  const token = await db.authToken();
  return get(`/api/places-search?q=${encodeURIComponent(q)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

export const photoSrc = (name, w = 800) => `/api/photo?name=${encodeURIComponent(name)}&w=${w}`;

// Which server settings are present (true/false only).
export const health = () => get("/api/health");
