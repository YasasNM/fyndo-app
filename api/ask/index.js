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

// Free AI providers, tried in this order. Add a key for any of them (all have free tiers with no card):
//  GROQ_API_KEY       console.groq.com        Llama 3.3 70B, about 1,000 requests a day free
//  CEREBRAS_API_KEY   cloud.cerebras.ai       gpt-oss-120b, about 14,400 requests a day free
//  GEMINI_API_KEY     aistudio.google.com     free tier (small daily limit on Flash models)
//  OPENROUTER_API_KEY openrouter.ai           ":free" models, about 50 requests a day
//  Azure OpenAI (AZURE_OPENAI_*) is used last, if set.
// If one is busy or out of quota, the next one answers. Only the user's sentence is sent, never names or emails.
const OPENAI_STYLE = [
  { name: "groq", key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "GROQ_MODEL", def: "llama-3.3-70b-versatile" },
  { name: "cerebras", key: "CEREBRAS_API_KEY", url: "https://api.cerebras.ai/v1/chat/completions", model: "CEREBRAS_MODEL", def: "gpt-oss-120b" },
  { name: "openrouter", key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "OPENROUTER_MODEL", def: "meta-llama/llama-3.3-70b-instruct:free" },
];

// Pull the JSON object out of a reply, even if the model wrapped it in ```json fences or added words.
function extractJson(text) {
  const t = String(text || "");
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return {};
}

async function askOpenAIStyle(p, q, log) {
  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env[p.key]}` },
    body: JSON.stringify({ model: process.env[p.model] || p.def, temperature: 0.2, max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: q }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error(`${p.name} error`, res.status, data && data.error && (data.error.message || data.error)); return null; }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || null;
}

async function askGemini(q, log) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
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
  return (parts && parts.map((x) => x.text || "").join("")) || null;
}

async function askAzure(q, log) {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const res = await fetch(`${endpoint}/openai/deployments/${encodeURIComponent(process.env.AZURE_OPENAI_DEPLOYMENT)}/chat/completions?api-version=${apiVersion}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.AZURE_OPENAI_API_KEY },
    body: JSON.stringify({ messages: [{ role: "system", content: SYSTEM }, { role: "user", content: q }], response_format: { type: "json_object" } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error("Azure OpenAI error", res.status, data && data.error); return null; }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || null;
}

// The providers that have keys, in order.
function providers() {
  const list = OPENAI_STYLE.filter((p) => process.env[p.key]).map((p) => ({ name: p.name, run: (q, log) => askOpenAIStyle(p, q, log) }));
  if (process.env.GEMINI_API_KEY) list.splice(Math.min(2, list.length), 0, { name: "gemini", run: askGemini });
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT) list.push({ name: "azure", run: askAzure });
  return list;
}

module.exports = async function (context, req) {
  try {
    const q = clean(req.body && req.body.q, 300);
    if (q.length < 3) return (context.res = json(400, { error: "Tell me a bit more." }));
    const list = providers();
    if (!list.length) return (context.res = json(503, { error: "AI is not set up yet." }));
    if (rateLimited(req, "ask", 30)) return (context.res = json(429, { error: "You've asked a lot! Try again in a bit." }));
    for (const p of list) {
      let text = null;
      try { text = await p.run(q, context.log); } catch (e) { context.log && context.log.error && context.log.error(p.name, e.message); }
      if (text) return (context.res = json(200, { ...sanitize(extractJson(text)), provider: p.name }));
    }
    context.res = json(502, { error: "AI is busy right now." });
  } catch (e) {
    context.res = json(500, { error: "AI request failed." });
  }
};

module.exports.providers = providers;
module.exports.sanitize = sanitize;
