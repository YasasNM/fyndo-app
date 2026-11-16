// GET /api/places-discover?area=Colombo%203 : Admin only. Popular food and drink places in one Fyndo area, from Google Places.
const { json, requireAdmin, rateLimited } = require("../shared/util");
const google = require("../shared/google");

const AREAS = {
  "Colombo 3": [6.906, 79.853], "Colombo 4": [6.895, 79.856], "Colombo 5": [6.885, 79.864],
  "Colombo 7": [6.909, 79.862], Dehiwala: [6.851, 79.865], "Mount Lavinia": [6.83, 79.863],
};

module.exports = async function (context, req) {
  try {
    const area = String((req.query && req.query.area) || "");
    if (!AREAS[area]) return (context.res = json(400, { error: "Unknown area." }));
    const admin = await requireAdmin(req);
    if (!admin.ok) return (context.res = json(admin.status, { error: admin.error }));
    if (rateLimited(req, "discover", 60)) return (context.res = json(429, { error: "Too many searches. Try again later." }));
    const [lat, lng] = AREAS[area];
    context.res = json(200, { area, results: await google.nearbyFood(lat, lng, 1500) });
  } catch (e) {
    context.log && context.log.error && context.log.error(e);
    context.res = json(e.status || 500, { error: e.message });
  }
};
