// Free AI providers, tried in this order until one answers. Add a key for any of them (all have free tiers, no card):
//  GROQ_API_KEY       console.groq.com        Llama 3.3 70B, about 1,000 requests a day free
//  CEREBRAS_API_KEY   cloud.cerebras.ai       gpt-oss-120b, about 14,400 requests a day free
//  GEMINI_API_KEY     aistudio.google.com     free tier (small daily limit on Flash models)
//  OPENROUTER_API_KEY openrouter.ai           ":free" models, about 50 requests a day
//  Azure OpenAI (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT) is used last, if set.
// Only the request text and public place details are ever sent, never names, emails or phone numbers.
const OPENAI_STYLE = [
  { name: "groq", key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "GROQ_MODEL", def: "llama-3.3-70b-versatile" },
  { name: "cerebras", key: "CEREBRAS_API_KEY", url: "https://api.cerebras.ai/v1/chat/completions", model: "CEREBRAS_MODEL", def: "gpt-oss-120b" },
  { name: "openrouter", key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "OPENROUTER_MODEL", def: "meta-llama/llama-3.3-70b-instruct:free" },
];
const TIMEOUT = 25000;

// Pull the JSON object out of a reply, even if the model wrapped it in ```json fences or added words.
function extractJson(text) {
  const t = String(text || "");
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return {};
}

async function askOpenAIStyle(p, system, user, opts, log) {
  const res = await fetch(p.url, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env[p.key]}` },
    body: JSON.stringify({ model: process.env[p.model] || p.def, temperature: opts.temperature, max_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error(`${p.name} error`, res.status, data && data.error && (data.error.message || data.error)); return null; }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || null;
}

async function askGemini(system, user, opts, log) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json", temperature: opts.temperature, maxOutputTokens: opts.maxTokens },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error("Gemini error", res.status, data && data.error && data.error.message); return null; }
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  return (parts && parts.map((x) => x.text || "").join("")) || null;
}

async function askAzure(system, user, opts, log) {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const res = await fetch(`${endpoint}/openai/deployments/${encodeURIComponent(process.env.AZURE_OPENAI_DEPLOYMENT)}/chat/completions?api-version=${apiVersion}`, {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { "Content-Type": "application/json", "api-key": process.env.AZURE_OPENAI_API_KEY },
    body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" },
      max_tokens: opts.maxTokens, temperature: opts.temperature }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { log && log.error && log.error("Azure OpenAI error", res.status, data && data.error); return null; }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || null;
}

// The providers that have keys, in order.
function providers() {
  const list = OPENAI_STYLE.filter((p) => process.env[p.key]).map((p) => ({ name: p.name, run: (s, u, o, log) => askOpenAIStyle(p, s, u, o, log) }));
  if (process.env.GEMINI_API_KEY) list.splice(Math.min(2, list.length), 0, { name: "gemini", run: askGemini });
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT) list.push({ name: "azure", run: askAzure });
  return list;
}

// Ask the first provider that answers; returns { data, provider } or null when none could.
// accept(data) lets the caller reject an answer that fails its checks, so the next provider gets a turn.
async function chatJson(system, user, { log, maxTokens = 700, temperature = 0.2, accept } = {}) {
  for (const p of providers()) {
    let text = null;
    try { text = await p.run(system, user, { maxTokens, temperature }, log); } catch (e) { log && log.error && log.error(p.name, e.message); }
    if (!text) continue;
    const data = extractJson(text);
    if (accept && !accept(data)) { log && log.warn && log.warn(`${p.name} answer failed checks`); continue; }
    return { data, provider: p.name };
  }
  return null;
}

module.exports = { chatJson, providers, extractJson };
