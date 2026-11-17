"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION } from "@/lib/tiles";
import { routeUrl } from "@/lib/gmaps";

// The stops of a date plan on a free Leaflet map, numbered in order.
// For turn-by-turn driving directions, the link opens the whole route in Google Maps (free).
export default function RouteMap({ stops, height = 280 }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const key = stops.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|");

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(el.current, { scrollWheelZoom: false }).setView([stops[0].lat, stops[0].lng], 13);
        L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      const map = mapRef.current;
      layerRef.current.clearLayers();
      const pts = stops.map((s) => [s.lat, s.lng]);
      L.polyline(pts, { color: "#11593A", weight: 3, opacity: 0.75, dashArray: "6 8" }).addTo(layerRef.current);
      stops.forEach((s, i) => {
        const icon = L.divIcon({ className: "route-pin", iconSize: [30, 30], iconAnchor: [15, 15], html: `<div>${i + 1}</div>` });
        L.marker([s.lat, s.lng], { icon, title: `${i + 1}. ${s.name}`, alt: `${i + 1}. ${s.name}` }).addTo(layerRef.current);
      });
      map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
      setTimeout(() => map.invalidateSize(), 50);
    })();
    return () => { dead = true; };
  }, [key]); // eslint-disable-line

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ marginBottom: 6 }}>Your stops on the map</h3>
      <div ref={el} className="spotmap" style={{ height }} role="region" aria-label="Map of your date stops" />
      <div className="row small" style={{ marginTop: 6 }}>
        <a className="linkbtn" href={routeUrl(stops)} target="_blank" rel="noreferrer">Get driving directions in Google Maps</a>
      </div>
    </div>
  );
}
