import registry from "./publicDetails.json";

// Outbound links only; reject credentials, local names, and all IP literals.
// This is a conservative URL check, not a DNS or destination verification.
export function safePublicUrl(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (!host.includes(".") || host.includes(":") || /^[\d.]+$/.test(host)) return null;
    if (/(^|\.)(localhost|local|internal|intranet|lan|home|arpa|invalid|test)$/.test(host)) return null;
    if (!host.split(".").every((part) => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/.test(part))) return null;
    return value;
  } catch {
    return null;
  }
}

// Never infer a venue match from its name, brand, or location.
export function publicDetailsFor(spot) {
  if (!spot || typeof spot.id !== "string" || !registry || Array.isArray(registry) || !Object.hasOwn(registry, spot.id)) return null;
  const entry = registry[spot.id];
  if (!entry || entry.id !== spot.id || !Array.isArray(entry.facts) || !Array.isArray(entry.sources)) return null;
  return entry;
}
