import reviews from "./descriptionReviews.json";

const OSM_BOILERPLATE = "Listed on OpenStreetMap; not independently verified by Fyndo.";

// Reviewed summaries are matched only by stored venue ID, never by a similar name.
// A later owner-written About takes precedence and must not inherit review credit.
export function descriptionReviewSource(spot) {
  const entry = reviews.find((entry) => entry.id === spot?.id);
  if (!entry) return null;
  const about = typeof spot?.about === "string" ? spot.about.trim() : "";
  const facts = venueFacts(spot);
  const canUseReview = !about || about.startsWith(OSM_BOILERPLATE) ||
    about === entry.description || about === facts ||
    about === `${facts.slice(0, -1)}, Sri Lanka.`;
  return canUseReview ? entry : null;
}

export function descriptionFor(spot) {
  const reviewed = descriptionReviewSource(spot);
  if (reviewed) return reviewed.description;
  const about = typeof spot?.about === "string" ? spot.about : "";
  if (about.trim() && !about.startsWith(OSM_BOILERPLATE)) return about;
  return venueFacts(spot);
}

function venueFacts(spot) {
  const name = spot?.name || "This venue";
  const category = String(spot?.category || "place").toLowerCase();
  const article = /^[aeiou]/i.test(category) ? "an" : "a";
  const area = String(spot?.area || "").replace(/\s*\(locality unknown\)\s*$/, "").trim();
  return `${name} is ${article} ${category}${area ? ` in ${area}` : ""}.`;
}
