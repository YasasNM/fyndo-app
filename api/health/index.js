// GET /api/health : says which server settings are present. Only true/false, never the secrets themselves.
const { json } = require("../shared/util");

module.exports = async function (context) {
  const azureAi = Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT);
  context.res = json(200, {
    ok: true,
    google: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    mapsBrowser: Boolean(process.env.GOOGLE_MAPS_BROWSER_KEY),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    ai: process.env.GEMINI_API_KEY ? "gemini" : azureAi ? "azure" : null,
  });
};
