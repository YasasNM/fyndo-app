// Links that open Google Maps (free: these are plain links, not API calls).
export const directionsUrl = (spot) =>
  spot.google_place_id
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.name)}&destination_place_id=${spot.google_place_id}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.lat != null ? `${spot.lat},${spot.lng}` : `${spot.name} ${spot.area} Sri Lanka`)}`;

// Opens the venue in Google Maps; visitors choose its Photos tab there.
// Maps URLs have no documented parameter for opening Photos directly.
export function photosUrl(spot) {
  // A name mixed with raw coordinates can fail even when the venue exists.
  // Use a readable venue search unless a verified Google place ID is available.
  const area = (spot.area || "Colombo District").replace(/\s*\(locality unknown\)\s*$/, "");
  const query = spot.google_place_id
    ? `${spot.name}, ${area}, Sri Lanka`
    : [spot.name, spot.category, area, "Sri Lanka"].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` +
    (spot.google_place_id ? `&query_place_id=${encodeURIComponent(spot.google_place_id)}` : "");
}

export const routeUrl = (stops) =>
  "https://www.google.com/maps/dir/" + stops.map((s) => encodeURIComponent(s.lat != null ? `${s.lat},${s.lng}` : `${s.name} ${s.area}`)).join("/");
