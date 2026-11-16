// GET /api/place?id=<google place id>&reviews=1 : live Google info for a spot page.
const { json, rateLimited } = require("../shared/util");
const google = require("../shared/google");

// Short-term memory cache (30 minutes): a busy place page costs one Google call per half hour,
// not one per visitor. The browser also keeps the answer for 30 minutes.
const cache = new Map();
const TTL = 30 * 60 * 1000;

module.exports = async function (context, req) {
  try {
    const id = String((req.query && req.query.id) || "");
    const withReviews = (req.query && req.query.reviews) === "1";
    if (rateLimited(req, "place", 300)) return (context.res = json(429, { error: "Too many requests. Try again later.", code: "busy" }));
    const ck = id + (withReviews ? ":r" : "");
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.t < TTL) return (context.res = json(200, hit.v, { "Cache-Control": "private, max-age=1800" }));
    const v = await google.details(id, withReviews);
    if (cache.size > 2000) cache.clear();
    cache.set(ck, { t: Date.now(), v });
    context.res = json(200, v, { "Cache-Control": "private, max-age=1800" });
  } catch (e) {
    // "quota" tells the app to stop asking for a while; the page still works with Fyndo's own info.
    context.res = json(e.status || 500, { error: e.message, code: e.quota ? "quota" : "error" });
  }
};
