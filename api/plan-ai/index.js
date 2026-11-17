// POST /api/plan-ai : the planner's rules shortlist real Fyndo places for each stop; a free AI picks the best
// combination for this person's vibe, budget, time and wishes, with one reason per stop.
// The AI can only choose from the shortlist: every id it returns is checked, and the night must fit the budget.
// If no AI answers (or every answer fails the checks), the app keeps its rule-based plan.
const { json, rateLimited, clean } = require("../shared/util");
const { chatJson } = require("../shared/llm");
const { place, num } = require("../shared/placeinput");

const SYSTEM = `You plan an evening out in Sri Lanka for two people, using ONLY the places listed for each stop.
Choose exactly one place per stop by its "id", all different. Rules:
- The estimated total for two (2 x "pp" of each chosen place, pp = average spend per person in LKR) must not be more than the budget.
- Prefer places that match the vibe and the person's wishes, are close to the previous stop ("km"), have good ratings, are verified.
- "why": one short sentence per stop, in simple English, using only facts given (price, area, rating, moods, features, distance). Never invent dishes, prices, views or anything not in the data.
- "tip": one short practical tip for the night based only on the data (for example the order, timing or keeping within budget).
Reply with JSON only: {"picks":[{"stop":0,"id":"...","why":"..."}],"tip":"..."}`;

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    const budget = num(b.budget, 0, 500000) || 0;
    const stops = (Array.isArray(b.stops) ? b.stops : []).slice(0, 4).map((s) => ({
      label: clean(s && s.label, 40),
      candidates: (Array.isArray(s && s.candidates) ? s.candidates : []).slice(0, 8).map(place).filter(Boolean),
    }));
    if (stops.length < 2 || stops.some((s) => !s.candidates.length)) return (context.res = json(400, { error: "Not enough places to plan with." }));
    if (rateLimited(req, "plan-ai", 40)) return (context.res = json(429, { error: "Lots of plans! Try again in a bit." }));

    const brief = {
      vibe: clean(b.vibe, 40), budget_for_two_lkr: budget, start: /^\d\d:\d\d$/.test(b.start || "") ? b.start : "", area: clean(b.area, 40),
      vegetarian: b.veg === true, wishes: clean(b.note, 200),
      stops: stops.map((s, i) => ({ stop: i, label: s.label, places: s.candidates })),
    };
    const ppOf = (i, id) => (stops[i].candidates.find((c) => c.id === id) || {}).pp || 0;
    const accept = (d) => {
      const picks = Array.isArray(d.picks) ? d.picks : [];
      if (picks.length !== stops.length) return false;
      const ids = new Set();
      for (const p of picks) {
        const i = Number(p.stop);
        if (!Number.isInteger(i) || i < 0 || i >= stops.length || !stops[i].candidates.some((c) => c.id === p.id) || ids.has(p.id)) return false;
        ids.add(p.id);
      }
      if (new Set(picks.map((p) => Number(p.stop))).size !== stops.length) return false;
      const total = picks.reduce((a, p) => a + ppOf(Number(p.stop), p.id) * 2, 0);
      return !budget || total <= budget * 1.05;
    };
    const out = await chatJson(SYSTEM, JSON.stringify(brief), { log: context.log, maxTokens: 700, accept });
    if (!out) return (context.res = json(502, { error: "AI is busy right now." }));
    const picks = out.data.picks.map((p) => ({ stop: Number(p.stop), id: p.id, why: clean(p.why, 180) })).sort((a, b) => a.stop - b.stop);
    context.res = json(200, { picks, tip: clean(out.data.tip, 220), provider: out.provider });
  } catch (e) {
    context.log && context.log.error && context.log.error(e);
    context.res = json(500, { error: "AI planning failed." });
  }
};
