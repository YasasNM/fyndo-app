// Google Places API (New). The key stays on the server, never in the browser.
// Rules we follow (Google Maps Platform terms):
//  - we only STORE the Google place ID; everything else is fetched live
//  - we show the Google Maps attribution and review authors next to Google content
const BASE = "https://places.googleapis.com/v1";

function key() {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) { const e = new Error("Google is not set up yet (GOOGLE_MAPS_API_KEY)."); e.status = 503; throw e; }
  return k;
}

async function call(path, { method = "GET", fieldMask, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "X-Goog-Api-Key": key(), ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error((data.error && data.error.message) || "Google request failed");
    e.status = res.status === 429 ? 429 : 502;
    throw e;
  }
  return data;
}

// Text search limited to Sri Lanka. Field mask keeps it on the cheaper "Pro" tier.
async function searchText(q) {
  const data = await call("/places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.googleMapsUri",
    body: { textQuery: q, regionCode: "LK", languageCode: "en", pageSize: 8,
            locationBias: { circle: { center: { latitude: 6.9, longitude: 79.86 }, radius: 50000 } } },
  });
  return (data.places || []).map((p) => ({
    id: p.id,
    name: p.displayName && p.displayName.text,
    address: p.formattedAddress,
    type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text,
    mapsUrl: p.googleMapsUri,
  }));
}

// Live details for a spot page. Reviews are only requested when the user taps
// "Show Google reviews" (they are a more expensive tier).
async function details(id, withReviews) {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(id)) { const e = new Error("Bad place ID"); e.status = 400; throw e; }
  const fields = ["id", "displayName", "formattedAddress", "googleMapsUri", "rating", "userRatingCount",
    "currentOpeningHours.openNow", "regularOpeningHours.weekdayDescriptions", "nationalPhoneNumber", "websiteUri", "photos"];
  if (withReviews) fields.push("reviews");
  const p = await call(`/places/${id}?languageCode=en&regionCode=LK`, { fieldMask: fields.join(",") });
  const out = {
    id: p.id,
    name: p.displayName && p.displayName.text,
    address: p.formattedAddress,
    mapsUrl: p.googleMapsUri,
    rating: p.rating || null,
    ratingCount: p.userRatingCount || 0,
    openNow: p.currentOpeningHours ? p.currentOpeningHours.openNow : null,
    hours: (p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions) || [],
    phone: p.nationalPhoneNumber || "",
    website: p.websiteUri || "",
    photo: null,
  };
  const ph = (p.photos || [])[0];
  if (ph) {
    const a = (ph.authorAttributions || [])[0] || {};
    out.photo = { name: ph.name, author: a.displayName || "", authorUrl: a.uri || "", mapsUrl: ph.googleMapsUri || out.mapsUrl };
  }
  if (withReviews) {
    out.reviews = (p.reviews || []).slice(0, 5).map((r) => ({
      rating: r.rating,
      text: (r.text && r.text.text) || "",
      original: (r.originalText && r.originalText.text) || "",
      translated: !!(r.text && r.originalText && r.text.languageCode !== r.originalText.languageCode),
      when: r.relativePublishTimeDescription || "",
      author: (r.authorAttribution && r.authorAttribution.displayName) || "Google user",
      authorUrl: (r.authorAttribution && r.authorAttribution.uri) || "",
      authorPhoto: (r.authorAttribution && r.authorAttribution.photoUri) || "",
      url: r.googleMapsUri || out.mapsUrl,
    }));
  }
  return out;
}

// Returns a short-lived Google photo URL (so the API key is never exposed).
async function photoUrl(name, width) {
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) { const e = new Error("Bad photo name"); e.status = 400; throw e; }
  const w = Math.min(Math.max(Number(width) || 800, 100), 1600);
  const data = await call(`/${name}/media?maxWidthPx=${w}&skipHttpRedirect=true`);
  return data.photoUri;
}

module.exports = { searchText, details, photoUrl };
