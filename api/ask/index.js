// POST /api/ask  { "q": "anniversary dinner under 6000 near colombo 7, veg" }
// An AI model (Gemini or Azure OpenAI) turns the sentence into search filters. It never picks or invents places:
// the app then matches the filters against real Fyndo spots.
const { json, rateLimited, clean } = require("../shared/util");
const { MOODS, CATEGORIES, AREAS, VIBES } = require("../shared/constants");
const { chatJson, providers } = require("../shared/llm");

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

// The free AI chain (Groq, Cerebras, Gemini, OpenRouter, Azure OpenAI) lives in ../shared/llm.js.

module.exports = async function (context, req) {
  try {
    const q = clean(req.body && req.body.q, 300);
    if (q.length < 3) return (context.res = json(400, { error: "Tell me a bit more." }));
    const list = providers();
    if (!list.length) return (context.res = json(503, { error: "AI is not set up yet." }));
    if (rateLimited(req, "ask", 30)) return (context.res = json(429, { error: "You've asked a lot! Try again in a bit." }));
    const out = await chatJson(SYSTEM, q, { log: context.log, maxTokens: 600 });
    if (out) return (context.res = json(200, { ...sanitize(out.data), provider: out.provider }));
    context.res = json(502, { error: "AI is busy right now." });
  } catch (e) {
    context.res = json(500, { error: "AI request failed." });
  }
};

module.exports.providers = providers;
module.exports.sanitize = sanitize;
