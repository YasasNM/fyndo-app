// GET /api/config : public settings the browser needs.
// mapsKey is the BROWSER key for Google maps (Maps JavaScript API + Maps Embed API). It is visible to visitors by design,
// so it must be a separate key restricted to your website address in Google Cloud. The server key is never sent.
const { json } = require("../shared/util");

module.exports = async function (context) {
  context.res = json(200, { mapsKey: String(process.env.GOOGLE_MAPS_BROWSER_KEY || "").trim() }, { "Cache-Control": "public, max-age=300" });
};
