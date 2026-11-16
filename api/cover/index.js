// GET /api/cover?id=<google place id>&w=600 : redirects to the place's first Google photo, for place cards.
// Set GOOGLE_CARD_PHOTOS=off in Azure to turn card photos off (cards then show example photos) without a redeploy.
const { json, rateLimited } = require("../shared/util");
const google = require("../shared/google");

module.exports = async function (context, req) {
  try {
    if (String(process.env.GOOGLE_CARD_PHOTOS || "").toLowerCase() === "off") return (context.res = json(404, { error: "Card photos are off." }));
    if (rateLimited(req, "cover", 400)) return (context.res = json(429, { error: "Too many requests." }));
    const url = await google.coverUrl(String((req.query && req.query.id) || ""), req.query && req.query.w);
    // The browser keeps this redirect for a day, so returning visitors don't trigger new Google calls.
    context.res = { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=86400" }, body: "" };
  } catch (e) {
    context.res = json(e.status === 400 ? 400 : 404, { error: e.message }, { "Cache-Control": "private, max-age=3600" });
  }
};
