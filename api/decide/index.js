// POST /api/decide : "Help me choose" on the Compare page. A free AI recommends one of the 2 or 3 places,
// using only the details shown in the table and what the person says matters to them.
const { json, rateLimited, clean } = require("../shared/util");
const { chatJson } = require("../shared/llm");
const { place } = require("../shared/placeinput");

const SYSTEM = `You help someone in Sri Lanka choose between a few places to go, using ONLY the details given.
Pick the one place that best fits what matters to them ("need"); if they gave no need, pick the best all-round choice.
- "why": two short sentences in simple English explaining the pick with facts from the data.
- "notes": for EVERY place, "good" = its strongest point and "watch" = one thing to check, both short and only from the data (for example closed now, higher price, no reviews yet, no booking).
Never invent dishes, prices, views or facts not in the data.
Reply with JSON only: {"pick":"<id>","why":"...","notes":[{"id":"...","good":"...","watch":"..."}]}`;

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    const places = (Array.isArray(b.places) ? b.places : []).slice(0, 3).map(place).filter(Boolean);
    if (places.length < 2) return (context.res = json(400, { error: "Pick 2 or 3 places to compare." }));
    if (rateLimited(req, "decide", 40)) return (context.res = json(429, { error: "Lots of questions! Try again in a bit." }));
    const ids = places.map((p) => p.id);
    const accept = (d) => ids.includes(d.pick) && Array.isArray(d.notes) && d.notes.every((n) => ids.includes(n && n.id));
    const out = await chatJson(SYSTEM, JSON.stringify({ need: clean(b.need, 200), now: clean(b.now, 5), places }),
      { log: context.log, maxTokens: 600, accept });
    if (!out) return (context.res = json(502, { error: "AI is busy right now. The table above has everything to compare." }));
    const notes = ids.map((id) => {
      const n = out.data.notes.find((x) => x.id === id) || {};
      return { id, good: clean(n.good, 140), watch: clean(n.watch, 140) };
    });
    context.res = json(200, { pick: out.data.pick, why: clean(out.data.why, 320), notes, provider: out.provider });
  } catch (e) {
    context.log && context.log.error && context.log.error(e);
    context.res = json(500, { error: "AI request failed." });
  }
};
