// Backup for "Ask Fyndo" when the AI is off or busy.
// Understands simple requests with keywords. Same output shape as /api/ask.
import { AREAS, CATEGORIES } from "./seed";

const AREA_WORDS = [
  [/col(ombo)?\s*0?3\b|kollupitiya|galle face/, "Colombo 3"], [/col(ombo)?\s*0?4\b|bambalapitiya/, "Colombo 4"],
  [/col(ombo)?\s*0?5\b|havelock|kirulapone/, "Colombo 5"], [/col(ombo)?\s*0?7\b|cinnamon gardens|independence/, "Colombo 7"],
  [/dehiwala/, "Dehiwala"], [/mount lavinia|mt\.? lavinia/, "Mount Lavinia"],
];

export function askLocal(q) {
  const t = " " + q.toLowerCase() + " ";
  const has = (re) => re.test(t);
  const out = { mode: "search", vibe: null, budget_for_two: null, max_price_per_person: null, area: null, categories: [],
    moods: [], veg: false, open_now: false, start_time: null, day_offset: null, keywords: [], reply: "", ai: false };

  for (const [re, a] of AREA_WORDS) if (re.test(t)) { out.area = a; break; }
  if (!out.area) out.area = AREAS.find((a) => t.includes(a.toLowerCase())) || null;

  // money: "6000", "6k", "rs 6,000", "lkr 6000"
  const m = t.match(/(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?\s*k\b|\d{3,6})/);
  if (m) {
    let n = m[1].toLowerCase().replace(/[,\s]/g, "");
    n = n.endsWith("k") ? parseFloat(n) * 1000 : parseFloat(n);
    if (n >= 200) {
      if (has(/per person|each|\bpp\b|a head/)) { out.max_price_per_person = n; out.budget_for_two = n * 2; }
      else out.budget_for_two = n;
    }
  }

  if (has(/date|anniversary|romantic|girlfriend|boyfriend|wife|husband|partner|propos/)) { out.mode = "plan"; out.vibe = "romantic"; out.moods.push("Date night"); }
  if (has(/sunset|beach|outdoor|walk|sea/)) { out.vibe = out.mode === "plan" ? "outdoor" : out.vibe; out.moods.push("Outdoor"); }
  if (has(/fun|lively|games|arcade|bowling|party/)) { out.vibe = out.vibe || "fun"; out.moods.push("Lively"); }
  if (has(/friends|gang|group/)) out.moods.push("With friends");
  if (has(/family|kids|parents/)) out.moods.push("Family");
  if (has(/cheap|budget|low cost|affordable/)) { out.moods.push("Budget"); out.vibe = out.vibe || "chill"; }
  if (has(/quiet|calm|peaceful/)) out.moods.push("Quiet");
  if (has(/late night|midnight|after 11/)) out.moods.push("Late night");
  if (has(/\bveg|vegetarian|vegan/)) out.veg = true;
  if (has(/open now|right now/)) out.open_now = true;
  if (has(/plan|night out|evening out|outing|whole night/)) { out.mode = "plan"; out.vibe = out.vibe || "romantic"; }
  if (has(/tomorrow/)) out.day_offset = 1;

  if (has(/coffee|cafe|café|tea/)) out.categories.push("Café");
  if (has(/dessert|ice cream|gelato|waffle|sweet/)) out.categories.push("Dessert");
  if (has(/street food|kottu|isso|wade|short eats/)) out.categories.push("Street Food");
  if (has(/dinner|lunch|restaurant|rice|curry|biryani|seafood/)) out.categories.push("Restaurant");
  out.categories = out.categories.filter((c) => CATEGORIES.includes(c));

  out.keywords = ["kottu", "biryani", "isso", "seafood", "crab", "pizza", "burger", "hopper", "rice", "tea", "gelato", "waffle"]
    .filter((k) => t.includes(k)).slice(0, 3);
  out.moods = [...new Set(out.moods)];
  out.reply = out.mode === "plan" ? "Here's a plan built from real Fyndo spots." : "Here are spots that match.";
  return out;
}
