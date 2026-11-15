// GET /api/places-search?q=... : Admin only. Find a real place on Google to link to a Fyndo spot.
const { json, requireAdmin, rateLimited, clean } = require("../shared/util");
const google = require("../shared/google");

module.exports = async function (context, req) {
  try {
    const q = clean(req.query && req.query.q, 120);
    if (q.length < 2) return (context.res = json(400, { error: "Type at least 2 letters." }));
    const admin = await requireAdmin(req);
    if (!admin.ok) return (context.res = json(admin.status, { error: admin.error }));
    if (rateLimited(req, "search", 120)) return (context.res = json(429, { error: "Too many searches. Try again later." }));
    context.res = json(200, { results: await google.searchText(q + " Sri Lanka") });
  } catch (e) {
    context.log && context.log.error && context.log.error(e);
    context.res = json(e.status || 500, { error: e.message });
  }
};
