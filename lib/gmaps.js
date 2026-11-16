"use client";
// Google Maps in the browser.
// - The browser key comes from /api/config (Azure setting GOOGLE_MAPS_BROWSER_KEY). It is restricted to your site in Google Cloud.
// - Maps Embed API (spot map, date route) is free with no usage limit.
// - Maps JavaScript API (the map with many pins) has a free monthly allowance.

let keyPromise = null;
export function getMapsKey() {
  if (!keyPromise) {
    keyPromise = fetch("/api/config").then((r) => (r.ok ? r.json() : {})).then((d) => d.mapsKey || "").catch(() => "");
  }
  return keyPromise;
}

let loader = null;
export function loadGoogleMaps(key) {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google && window.google.maps && window.google.maps.importLibrary) return Promise.resolve(window.google.maps);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    window.__fyndoMapsReady = () => resolve(window.google.maps);
    window.gm_authFailure = () => { window.__fyndoMapsAuthFailed = true; window.dispatchEvent(new Event("fyndo-maps-auth")); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=marker&region=LK&language=en&callback=__fyndoMapsReady`;
    s.async = true;
    s.onerror = () => { loader = null; reject(new Error("Google Maps could not load. Check your connection.")); };
    document.head.appendChild(s);
  });
  return loader;
}

// Where a place is, for Google: its place ID when linked (exact listing), else its coordinates, else name + area.
export function placeQuery(spot) {
  if (spot.google_place_id) return `place_id:${spot.google_place_id}`;
  if (spot.lat != null && spot.lng != null) return `${spot.lat},${spot.lng}`;
  return `${spot.name}, ${spot.area}, Sri Lanka`;
}

export const embedPlaceUrl = (key, spot) =>
  `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(placeQuery(spot))}&zoom=16&language=en&region=LK`;

export function embedRouteUrl(key, stops) {
  const q = stops.map(placeQuery);
  const p = new URLSearchParams({ key, origin: q[0], destination: q[q.length - 1], mode: "driving", language: "en", region: "LK" });
  if (q.length > 2) p.set("waypoints", q.slice(1, -1).join("|"));
  return `https://www.google.com/maps/embed/v1/directions?${p}`;
}

export const directionsUrl = (spot) =>
  spot.google_place_id
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.name)}&destination_place_id=${spot.google_place_id}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.lat != null ? `${spot.lat},${spot.lng}` : `${spot.name} ${spot.area}`)}`;

export const routeUrl = (stops) => {
  const q = stops.map((s) => (s.lat != null ? `${s.lat},${s.lng}` : `${s.name} ${s.area}`));
  return `https://www.google.com/maps/dir/${q.map(encodeURIComponent).join("/")}`;
};
