// GET /api/place?id=<google place id>&reviews=1 : live Google info for a spot page.
const { json, rateLimited } = require("../shared/util");
const google = require("../shared/google");

// Tiny short-term memory cache (10 minutes) so one busy page doesn't trigger many paid calls.
const cache = new Map();
const TTL = 10 * 60 * 1000;

module.exports = async function (context, req) {
  try {
    const id = String((req.query && req.query.id) || "");
    const withReviews = (req.query && req.query.reviews) === "1";
    if (rateLimited(req, "place", 200)) return (context.res = json(429, { error: "Too many requests. Try again later." }));
    const ck = id + (withReviews ? ":r" : "");
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.t < TTL) return (context.res = json(200, hit.v));
    const v = await google.details(id, withReviews);
    cache.set(ck, { t: Date.now(), v });
    if (cache.size > 500) cache.clear();
    context.res = json(200, v);
  } catch (e) {
    context.res = json(e.status || 500, { error: e.message });
  }
};
