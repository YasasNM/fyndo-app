// Links that open Google Maps (free: these are plain links, not API calls).
export const directionsUrl = (spot) =>
  spot.google_place_id
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.name)}&destination_place_id=${spot.google_place_id}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.lat != null ? `${spot.lat},${spot.lng}` : `${spot.name} ${spot.area} Sri Lanka`)}`;

export const routeUrl = (stops) =>
  "https://www.google.com/maps/dir/" + stops.map((s) => encodeURIComponent(s.lat != null ? `${s.lat},${s.lng}` : `${s.name} ${s.area}`)).join("/");
