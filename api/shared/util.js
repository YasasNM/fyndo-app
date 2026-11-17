// Small helpers shared by all Fyndo server functions.

const json = (status, body, extra = {}) => ({
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  body: JSON.stringify(body),
});

// The visitor's address. Azure sets x-azure-clientip / x-client-ip itself; the first x-forwarded-for entry
// can be typed by the visitor, so it is only the last resort. "1.2.3.4:5678" loses its port.
function clientIp(req) {
  const h = (req && req.headers) || {};
  const raw = String(h["x-azure-clientip"] || h["x-client-ip"] || h["x-forwarded-for"] || "local").split(",")[0].trim();
  const v4 = raw.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  return (v4 ? v4[1] : raw.replace(/^\[|\](?::\d+)?$/g, "")).slice(0, 64);
}

// Per-visitor limit plus an overall limit for each function (memory only, per server instance).
// A speed bump against abuse that keeps the free AI and Google quotas for everyone; the hard limits
// are the quotas set in Google Cloud and the AI providers.
const buckets = new Map();
function hit(id, maxPerHour, now) {
  const b = buckets.get(id) || { start: now, n: 0 };
  if (now - b.start > 3600000) { b.start = now; b.n = 0; }
  b.n += 1;
  buckets.set(id, b);
  return b.n > maxPerHour;
}
function sweep(now) {
  if (buckets.size <= 20000) return;
  for (const [k, b] of buckets) if (now - b.start > 3600000) buckets.delete(k);
  // Still full of fresh entries (someone rotating addresses): drop the oldest half, keep the overall counters.
  if (buckets.size > 20000) {
    const keys = [...buckets.keys()].filter((k) => !k.startsWith("all:"));
    keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => buckets.delete(k));
  }
}
function rateLimited(req, key, maxPerHour, totalPerHour = maxPerHour * 60) {
  const now = Date.now();
  sweep(now);
  const mine = hit(key + ":" + clientIp(req), maxPerHour, now);
  const all = hit("all:" + key, totalPerHour, now);
  return mine || all;
}

// Checks the logged-in user is an admin, using their Supabase login token.
// The token comes in X-Fyndo-Token (Azure can replace the standard Authorization header) or Authorization.
async function requireAdmin(req) {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const anon = String(process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return { ok: false, status: 503, error: "Connect Supabase first (SUPABASE_URL and SUPABASE_ANON_KEY settings)." };
  const h = req.headers || {};
  const custom = String(h["x-fyndo-token"] || "").trim();
  const auth = custom ? "Bearer " + custom : String(h["authorization"] || "");
  if (!auth.startsWith("Bearer ") || auth.length < 20) return { ok: false, status: 401, error: "Please log in as admin." };
  const headers = { apikey: anon, Authorization: auth };
  let u;
  try { u = await fetch(`${url}/auth/v1/user`, { headers, signal: AbortSignal.timeout(8000) }); }
  catch { return { ok: false, status: 502, error: "Could not reach Supabase. Check the SUPABASE_URL setting for typos." }; }
  if (!u.ok) {
    const body = await u.json().catch(() => ({}));
    const why = String(body.msg || body.message || body.error_description || body.error || "").slice(0, 120);
    const hint = u.status === 401 && /api key/i.test(why) ? " The SUPABASE_ANON_KEY setting looks wrong." : u.status === 404 ? " The SUPABASE_URL setting looks wrong." : " Log out and log in again.";
    return { ok: false, status: 401, error: `Supabase did not accept the login (${u.status}${why ? ": " + why : ""}).${hint}` };
  }
  const user = await u.json();
  let rows = [];
  try {
    const p = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, { headers, signal: AbortSignal.timeout(8000) });
    rows = p.ok ? await p.json().catch(() => []) : [];
  } catch { return { ok: false, status: 502, error: "Could not reach Supabase. Try again in a minute." }; }
  if (!rows[0] || rows[0].role !== "admin") return { ok: false, status: 403, error: "Admins only." };
  return { ok: true, user };
}

const clean = (s, max = 300) => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

module.exports = { json, rateLimited, requireAdmin, clean, clientIp };
