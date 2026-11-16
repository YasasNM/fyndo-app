// POST /api/photo-finder  { name, lat, lng, website, googlePlaceId } : Admin only.
// Looks for real photos of one place (OpenStreetMap, Wikimedia Commons, the place's own website) and returns candidates.
const { json, requireAdmin, rateLimited, clean } = require("../shared/util");
const { findPhotos } = require("../shared/photofind");
const google = require("../shared/google");

module.exports = async function (context, req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return (context.res = json(admin.status, { error: admin.error }));
    if (rateLimited(req, "photofind", 900)) return (context.res = json(429, { error: "Too many lookups. Try again in an hour." }));
    const b = req.body || {};
    const name = clean(b.name, 120);
    if (name.length < 2) return (context.res = json(400, { error: "Missing place name." }));
    const lat = b.lat === null || b.lat === "" ? NaN : Number(b.lat);
    const lng = b.lng === null || b.lng === "" ? NaN : Number(b.lng);
    const website = clean(b.website, 300);
    const gid = clean(b.googlePlaceId, 300);
    const useGoogle = gid && process.env.GOOGLE_MAPS_API_KEY && !google.paused();
    const result = await findPhotos({ name, lat, lng, website }, { websiteLookup: useGoogle ? () => google.websiteFor(gid) : null });
    context.res = json(200, result);
  } catch (e) {
    context.log && context.log.error && context.log.error(e);
    context.res = json(500, { error: "Photo lookup failed: " + e.message });
  }
};
