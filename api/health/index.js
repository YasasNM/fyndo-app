// GET /api/health : says which server settings are present. Only true/false, never the secrets themselves.
const { json } = require("../shared/util");

module.exports = async function (context) {
  context.res = json(200, {
    ok: true,
    google: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    ai: require("../ask/index.js").providers().map((x) => x.name).join(", ") || null,
  });
};
