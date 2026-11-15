// Small helpers shared by all Fyndo server functions.

const json = (status, body, extra = {}) => ({
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  body: JSON.stringify(body),
});

// Very simple per-IP rate limit (memory only, resets when the function restarts).
// It's a speed bump against abuse; the hard limit is the daily quota you set in Google Cloud.
const buckets = new Map();
function rateLimited(req, key, maxPerHour) {
  const ip = String((req.headers && (req.headers["x-forwarded-for"] || req.headers["x-client-ip"])) || "local").split(",")[0].trim();
  const id = key + ":" + ip;
  const now = Date.now();
  const b = buckets.get(id) || { start: now, n: 0 };
  if (now - b.start > 3600000) { b.start = now; b.n = 0; }
  b.n += 1;
  buckets.set(id, b);
  if (buckets.size > 5000) buckets.clear();
  return b.n > maxPerHour;
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
  try { u = await fetch(`${url}/auth/v1/user`, { headers }); }
  catch { return { ok: false, status: 502, error: "Could not reach Supabase. Check the SUPABASE_URL setting for typos." }; }
  if (!u.ok) {
    const body = await u.json().catch(() => ({}));
    const why = String(body.msg || body.message || body.error_description || body.error || "").slice(0, 120);
    const hint = u.status === 401 && /api key/i.test(why) ? " The SUPABASE_ANON_KEY setting looks wrong." : u.status === 404 ? " The SUPABASE_URL setting looks wrong." : " Log out and log in again.";
    return { ok: false, status: 401, error: `Supabase did not accept the login (${u.status}${why ? ": " + why : ""}).${hint}` };
  }
  const user = await u.json();
  const p = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, { headers });
  const rows = p.ok ? await p.json() : [];
  if (!rows[0] || rows[0].role !== "admin") return { ok: false, status: 403, error: "Admins only." };
  return { ok: true, user };
}

const clean = (s, max = 300) => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

module.exports = { json, rateLimited, requireAdmin, clean };
