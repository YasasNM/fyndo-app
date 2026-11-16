"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { CAT_ICON, ICON_MARKUP } from "@/components/Icon";
import { TILE_URL, TILE_ATTRIBUTION, COLOMBO } from "@/lib/tiles";

// Leaflet map with a pin for every place (free).
// spots: array with lat/lng. me: optional { lat, lng }. height: px. single: one place, no popups.
export default function SpotMap({ spots, me, height = 420, single = false }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(el.current, { scrollWheelZoom: false }).setView(COLOMBO, 12);
        L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      const map = mapRef.current;
      layerRef.current.clearLayers();
      const pts = [];
      spots.filter((s) => s.lat != null && s.lng != null).forEach((s) => {
        const icon = L.divIcon({
          className: "fy-pin", iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -28],
          html: `<div style="background:${s.color || "#F6B800"}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#141414" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)">${ICON_MARKUP[CAT_ICON[s.category] || "pin"]}</svg></div>`,
        });
        const m = L.marker([s.lat, s.lng], { icon, title: s.name, alt: s.name }).addTo(layerRef.current);
        if (!single) {
          const box = document.createElement("div");
          const a = document.createElement("a");
          a.href = `/spot?id=${encodeURIComponent(s.id)}`; a.textContent = s.name; a.style.fontWeight = "700";
          const sub = document.createElement("div");
          sub.textContent = `${s.area}, ${s.category}`; sub.style.fontSize = "12px";
          box.append(a, sub);
          m.bindPopup(box);
        }
        pts.push([s.lat, s.lng]);
      });
      if (me) {
        L.circleMarker([me.lat, me.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
          .addTo(layerRef.current).bindTooltip("You are here");
        pts.push([me.lat, me.lng]);
      }
      if (pts.length === 1) map.setView(pts[0], 16);
      else if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 });
      setTimeout(() => map.invalidateSize(), 50);
    })();
    return () => { dead = true; };
  }, [spots, me, single]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  return <div ref={el} className="spotmap" style={{ height }} role="region" aria-label={single ? "Map of this place" : "Map of places"} />;
}
