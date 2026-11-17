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

// Turns Google's long error text into something an admin can act on.
function friendly(raw, status) {
  if (status === 429 || /quota/i.test(raw)) {
    if (/per day/i.test(raw)) return "Google's daily limit is used up (it resets at midnight, US Pacific time). Fyndo keeps working with its own info until then.";
    if (/per minute|per second/i.test(raw)) return "Google is busy. Try again in a minute.";
    return "Google's limit for this project has been reached. Fyndo keeps working with its own info.";
  }
  if (/api key not valid|API_KEY_INVALID/i.test(raw)) return "Google rejected the key. Check the GOOGLE_MAPS_API_KEY setting in Azure.";
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(raw)) return "Places API (New) is not turned on for this Google project. Enable it in Google Cloud, then try again.";
  if (/referer|referrer|IP address/i.test(raw)) return "This Google key is restricted to websites or IP addresses, so the server cannot use it. Create a key with only an API restriction.";
  return raw;
}

// Circuit breaker: once Google says a limit is used up, stop calling it for a while.
// Thousands of visitors then get an instant "not available" (and Fyndo's own info) instead of
// each request waiting on Google and burning the next minute's quota.
let pausedUntil = 0, pauseMsg = "";
const PAUSE_MS = 15 * 60 * 1000;
function paused() { return Date.now() < pausedUntil ? pauseMsg : ""; }

async function call(path, { method = "GET", fieldMask, body } = {}) {
  const p = paused();
  if (p) { const e = new Error(p); e.status = 429; e.quota = true; e.paused = true; throw e; }
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "X-Goog-Api-Key": key(), ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000), // never keep a visitor waiting on a slow Google answer
    });
  } catch (err) {
    if (err && err.status) throw err; // missing key: keep that message
    const e = new Error("Could not reach Google right now. Fyndo's own info still works; try again in a minute.");
    e.status = 502;
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = (data.error && data.error.message) || "Google request failed";
    const e = new Error(friendly(raw, res.status));
    e.status = res.status === 429 || /quota/i.test(raw) ? 429 : 502;
    e.quota = e.status === 429;
    if (e.quota) { pausedUntil = Date.now() + (/per minute|per second/i.test(raw) ? 60 * 1000 : PAUSE_MS); pauseMsg = e.message; }
    throw e;
  }
  return data;
}

// Text search limited to Sri Lanka. Field mask keeps it on the cheaper "Pro" tier.
async function searchText(q) {
  const data = await call("/places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.googleMapsUri,places.location",
    body: { textQuery: q, regionCode: "LK", languageCode: "en", pageSize: 8,
            locationBias: { circle: { center: { latitude: 6.9, longitude: 79.86 }, radius: 50000 } } },
  });
  return (data.places || []).map((p) => ({
    id: p.id,
    name: p.displayName && p.displayName.text,
    address: p.formattedAddress,
    type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text,
    mapsUrl: p.googleMapsUri,
    lat: p.location ? p.location.latitude : null,
    lng: p.location ? p.location.longitude : null,
  }));
}

// Food and drink places around a point, most popular first (Places API Nearby Search, max 20 per call).
const FOOD_TYPES = ["restaurant", "cafe", "coffee_shop", "bakery", "ice_cream_shop", "dessert_shop", "fast_food_restaurant", "tea_house", "sri_lankan_restaurant"];
async function nearbyFood(lat, lng, radius = 1500) {
  const data = await call("/places:searchNearby", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.formattedAddress,places.primaryType,places.primaryTypeDisplayName,places.googleMapsUri,places.location,places.businessStatus",
    body: { includedTypes: FOOD_TYPES, maxResultCount: 20, rankPreference: "POPULARITY", languageCode: "en", regionCode: "LK",
            locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } } },
  });
  return (data.places || []).filter((p) => !p.businessStatus || p.businessStatus === "OPERATIONAL").map((p) => ({
    id: p.id,
    name: p.displayName && p.displayName.text,
    address: p.formattedAddress,
    type: p.primaryType || "",
    typeLabel: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text,
    mapsUrl: p.googleMapsUri,
    lat: p.location ? p.location.latitude : null,
    lng: p.location ? p.location.longitude : null,
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
  // Up to 6 photos. Only the names are sent; the browser asks for each image when it is shown.
  out.photos = (p.photos || []).slice(0, 6).map((ph) => {
    const a = (ph.authorAttributions || [])[0] || {};
    return { name: ph.name, author: a.displayName || "", authorUrl: a.uri || "", mapsUrl: ph.googleMapsUri || out.mapsUrl };
  });
  out.photo = out.photos[0] || null;
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

// Cover photo for a place card: the first Google photo. The short-lived photo address is kept in memory
// for up to 50 minutes so many visitors seeing the same card cost one Google call, not one each.
const coverCache = new Map();
async function coverUrl(placeId, width) {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) { const e = new Error("Bad place ID"); e.status = 400; throw e; }
  const w = Math.min(Math.max(Number(width) || 600, 200), 1200);
  const key = placeId + ":" + w;
  const hit = coverCache.get(key);
  if (hit && Date.now() - hit.at < 50 * 60 * 1000) return hit.uri;
  const p = await call(`/places/${placeId}`, { fieldMask: "photos" });
  const ph = (p.photos || [])[0];
  if (!ph) { const e = new Error("No photo"); e.status = 404; throw e; }
  const uri = await photoUrl(ph.name, w);
  if (coverCache.size > 3000) coverCache.clear();
  coverCache.set(key, { uri, at: Date.now() });
  return uri;
}

// Just the place's own website address (used once by the admin photo finder).
async function websiteFor(placeId) {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId || "")) return "";
  const p = await call(`/places/${placeId}`, { fieldMask: "websiteUri" });
  return p.websiteUri || "";
}

module.exports = { searchText, nearbyFood, details, photoUrl, coverUrl, websiteFor, paused, _resetPause: () => { pausedUntil = 0; } };
