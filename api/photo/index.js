// GET /api/photo?name=places/.../photos/...&w=800 : redirects to a Google photo without exposing the key.
const { json, rateLimited } = require("../shared/util");
const google = require("../shared/google");

module.exports = async function (context, req) {
  try {
    if (rateLimited(req, "photo", 200)) return (context.res = json(429, { error: "Too many requests." }));
    const url = await google.photoUrl(String((req.query && req.query.name) || ""), req.query && req.query.w);
    context.res = { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=3000" }, body: "" };
  } catch (e) {
    context.res = json(e.status || 500, { error: e.message });
  }
};
