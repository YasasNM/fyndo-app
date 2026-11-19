import registry from "./publicPrices.json";
import { safePublicUrl } from "./publicDetails";

const text = (value) => typeof value === "string" && Boolean(value.trim());
const positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const date = (value) => {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  // Check the stated calendar date, not its possibly different UTC date.
  return new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) === match[1];
};

// In addition to rejecting private/local destinations, exclude login links and
// signed/authenticated URLs. This is a conservative lexical check, not DNS verification.
function sourceUrl(value) {
  if (!safePublicUrl(value)) return null;
  const url = new URL(value);
  if (url.port && !["80", "443"].includes(url.port)) return null;
  const sensitive = /token|secret|password|passwd|auth|session|credential|signature|api[-_]?key|access[-_]?key|jwt|signed|code/i;
  if ([...url.searchParams.keys()].some((key) => sensitive.test(key))) return null;
  if (url.hash) return null;
  try {
    if (/(?:^|\/)(?:login|log-in|signin|sign-in|oauth|auth|account|admin|private|internal)(?:\/|$)/i.test(decodeURIComponent(url.pathname))) return null;
  } catch { return null; }
  return value;
}

function attribution(value, sources) {
  return value && sourceUrl(value.sourceUrl) && text(value.sourceLabel) && text(value.quote) && date(value.retrievedAt) && sources.some((s) => s.url === value.sourceUrl);
}

// Never infer a branch from a brand/name, or per-person spend from menu items.
// The publication audit supplies exact-branch evidence; current DB names win.
export function publicPricesFor(spot) {
  if (!spot || typeof spot.id !== "string" || !/^[a-z\d][a-z\d_-]{0,127}$/i.test(spot.id) || !registry || Array.isArray(registry) || !Object.hasOwn(registry, spot.id)) return null;
  const entry = registry[spot.id];
  if (!entry || entry.id !== spot.id || !text(entry.name) || entry.identityEvidence?.basis !== "exact_branch" || !Array.isArray(entry.items) || !Array.isArray(entry.sources)) return null;
  const sources = entry.sources.filter((s) => s && sourceUrl(s.url) && text(s.label) && date(s.retrievedAt));
  const raw = entry.spend;
  const spend = raw && positive(raw.min) && positive(raw.max) && raw.min <= raw.max && raw.currency === "LKR" && raw.unit === "per_person" && raw.estimated === true && raw.channel === "reported" && attribution(raw, sources) ? raw : null;
  const items = entry.items.filter((item) => item && text(item.item) && positive(item.price) && item.currency === "LKR" && item.unit === "item" && ["delivery", "dine_in", "published_menu"].includes(item.channel) && attribution(item, sources));
  if (!spend && !items.length) return null;
  return { ...entry, name: spot.name, spend, items, sources };
}
