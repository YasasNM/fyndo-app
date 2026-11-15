// POST /api/ask  { "q": "anniversary dinner under 6000 near colombo 7, veg" }
// An AI model (Gemini or Azure OpenAI) turns the sentence into search filters. It never picks or invents places:
// the app then matches the filters against real Fyndo spots.
const { json, rateLimited, clean } = require("../shared/util");
const { MOODS, CATEGORIES, AREAS, VIBES } = require("../shared/constants");

const SYSTEM = `You turn a Sri Lankan user's request for places to go (food, cafes, dates, outings) into JSON filters.
Reply with JSON only, using exactly these keys:
{
 "mode": "plan" if they want a date, night out or outing with several stops, otherwise "search",
 "vibe": one of ${JSON.stringify(VIBES)} or null (romantic = quiet/anniversary/date; fun = lively/friends/games; outdoor = beach/sunset/walk; chill = cheap/simple/coffee),
 "budget_for_two": number in LKR or null (if they give a per-person budget, double it; "5k" = 5000),
 "max_price_per_person": number in LKR or null,
 "area": one of ${JSON.stringify(AREAS)} or null ("col 7", "cinnamon gardens" = "Colombo 7"; "kollupitiya" or "galle face" = "Colombo 3"; "bambalapitiya" = "Colombo 4"; "havelock" = "Colombo 5"),
 "categories": subset of ${JSON.stringify(CATEGORIES)},
 "moods": subset of ${JSON.stringify(MOODS)},
 "veg": true or false,
 "open_now": true or false,
 "start_time": "HH:MM" 24h or null,
 "day_offset": 0 for today, 1 for tomorrow, up to 6, or null,
 "keywords": up to 3 food words to search for (e.g. "kottu", "biryani") as an array,
 "reply": one short friendly sentence in simple English saying what you will show. No promises about specific places.
}
If the request is not about places to go in Sri Lanka, set mode "search", leave filters empty, and say in reply that Fyndo helps find places to eat, hang out and go on dates.`;

const pick = (v, list) => (list.includes(v) ? v : null);
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null; };

// Never trust the model output: keep only allowed values.
function sanitize(o) {
  return {
    mode: o.mode === "plan" ? "plan" : "search",
    vibe: pick(o.vibe, VIBES),
    budget_for_two: num(o.budget_for_two, 0, 200000),
    max_price_per_person: num(o.max_price_per_person, 0, 100000),
    area: pick(o.area, AREAS),
    categories: (Array.isArray(o.categories) ? o.categories : []).filter((c) => CATEGORIES.includes(c)),
    moods: (Array.isArray(o.moods) ? o.moods : []).filter((m) => MOODS.includes(m)),
    veg: o.veg === true,
    open_now: o.open_now === true,
    start_time: /^([01]\d|2[0-3]):[0-5]\d$/.test(o.start_time || "") ? o.start_time : null,
    day_offset: num(o.day_offset, 0, 6),
    keywords: (Array.isArray(o.keywords) ? o.keywords : []).map((k) => clean(k, 30).toLowerCase()).filter(Boolean).slice(0, 3),
    reply: clean(o.reply, 220) || "Here's what I found.",
    ai: true,
  };
}

// Two AI options, use whichever you have a key for:
//  - Google Gemini (free tier from Google AI Studio, no card): set GEMINI_API_KEY (optional GEMINI_MODEL)
//  - Azure OpenAI: set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT
// Only the user's sentence is sent. No names, emails or other personal data.
async function askGemini(q, log) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: q }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error("Gemini error", res.status, data && data.error && data.error.message); return null; }
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  return (parts && parts.map((p) => p.text || "").join("")) || "";
}

async function askAzure(q, log) {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const res = await fetch(`${endpoint}/openai/deployments/${encodeURIComponent(process.env.AZURE_OPENAI_DEPLOYMENT)}/chat/completions?api-version=${apiVersion}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.AZURE_OPENAI_API_KEY },
    body: JSON.stringify({
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: q }],
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error("Azure OpenAI error", res.status, data && data.error); return null; }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
}

module.exports = async function (context, req) {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasAzure = Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT);
  try {
    const q = clean(req.body && req.body.q, 300);
    if (q.length < 3) return (context.res = json(400, { error: "Tell me a bit more." }));
    if (!hasGemini && !hasAzure) return (context.res = json(503, { error: "AI is not set up yet." }));
    if (rateLimited(req, "ask", 30)) return (context.res = json(429, { error: "You've asked a lot! Try again in a bit." }));

    const log = context.log;
    let text = hasGemini ? await askGemini(q, log) : await askAzure(q, log);
    // If Gemini is busy and Azure is also set up, try Azure before giving up.
    if (text === null && hasGemini && hasAzure) text = await askAzure(q, log);
    if (text === null) return (context.res = json(502, { error: "AI is busy right now." }));

    let parsed = {};
    try { parsed = JSON.parse(text || "{}"); } catch { parsed = {}; }
    context.res = json(200, sanitize(parsed));
  } catch (e) {
    context.res = json(500, { error: "AI request failed." });
  }
};

module.exports.sanitize = sanitize;
