// Picks a cover photo for a place that has no photo of its own yet.
// Real-place photos (the park, museum or zoo itself) are shown as is; everything else is an
// "example" photo of that kind of food or place, and the card says so.
import { PHOTOS } from "./photoCredits";

const RULES = [
  [/viharamahadevi/i, "park"],
  [/national museum/i, "museum"],
  [/zoo/i, "zoo"],
  [/pizza|vito|giovanni|ti amo|como|la luna/i, "pizza"],
  [/biryani|bhavan|dindigul|thalappakatti|abid|karachi|bin dawood/i, "biryani"],
  [/dosa|vihar|shanmuga|amman|elite indian|indian/i, "dosa"],
  [/crab|seafood|sea food|fish|barracuda|catamaran|buba|tilapiya/i, "seafood"],
  [/chinese|dragon|wok|noodle|kiku|asiana/i, "fried-rice"],
  [/ice cream|gelato|sundae|bing chun|rio|carnival|chandra|frozen/i, "ice-cream"],
  [/cake|brownie|choco|donut|dessert|waffle|sweet/i, "cake"],
  [/bake|bakery|baker|caravan fresh|paan paan|fab|pastry|bread|bun/i, "bakery"],
  [/tea\b|tea |kopi|t-lounge/i, "tea"],
  [/coffee|caf[eé]|java|barista|commons|grind|kumbuk|mocha|brew|bean|espresso|seed/i, "coffee"],
  [/kottu|kothu|pilawoos|hotel de|rice and curry|lanka/i, "kottu"],
  [/burger|chicken|popeyes|dinemore|street|food square|grill/i, "street-food"],
  [/cinema|cineplex|imax|scope|savoy|theatre|eros|concord|majestic|city lite/i, "cinema"],
  [/museum|planetarium|gallery|art/i, "museum"],
  [/beach|marine drive|view point|viewpoint|sea/i, "beach"],
  [/park|garden|uyana|green/i, "park"],
];
const BY_CATEGORY = { Restaurant: "restaurant", "Café": "coffee", "Street Food": "street-food", Dessert: "cake", Activity: "galle-face" };

// Each kind has several photos; a place always gets the same one (picked from its id), so neighbouring cards differ.
const variants = (base) => Object.keys(PHOTOS).filter((k) => k === base || new RegExp(`^${base}-\\d+$`).test(k));
const POOLS = { restaurant: [...variants("rice-curry"), ...variants("restaurant")] };
const SCENES = /^(restaurant|coffee|bakery|street-food-2)/; // photos of a room or a stall rather than a dish
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export function coverFor(spot) {
  const name = String(spot.name || "");
  let base = (RULES.find(([re]) => re.test(name)) || [])[1];
  if (spot.category === "Activity" && base && !["park", "museum", "zoo", "cinema", "beach"].includes(base)) base = null;
  base = base || BY_CATEGORY[spot.category];
  if (!base) return null;
  const pool = (POOLS[base] || variants(base)).filter((k) => PHOTOS[k]);
  if (!pool.length) return null;
  const p0 = PHOTOS[pool[0]];
  // A photo of the real place (park, museum, zoo) is never swapped for a variant.
  const real = Boolean(p0.real && new RegExp(p0.real.split(" ")[0], "i").test(name));
  const slug = real ? pool[0] : pool[hash(String(spot.id || name)) % pool.length];
  const p = PHOTOS[slug];
  return { slug, src: `/img/${slug}-500.jpg`, large: `/img/${slug}-1280.jpg`, alt: p.alt, real, scene: SCENES.test(slug) };
}
