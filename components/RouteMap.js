"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

// Free driving route between the stops of a date plan.
// Map: OpenStreetMap tiles. Route: OSRM public server (no key). Used lightly: one request per plan.
// stops: [{ id, name, lat, lng }] in visiting order. If routing is down we draw a straight dashed line instead.
export default function RouteMap({ stops, height = 260 }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [info, setInfo] = useState(null);
  const key = stops.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|");

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(el.current, { scrollWheelZoom: false }).setView([stops[0].lat, stops[0].lng], 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      const map = mapRef.current;
      layerRef.current.clearLayers();
      setInfo(null);

      stops.forEach((s, idx) => {
        const icon = L.divIcon({
          className: "route-pin", iconSize: [30, 30], iconAnchor: [15, 15],
          html: `<div>${idx + 1}</div>`,
        });
        L.marker([s.lat, s.lng], { icon, title: `${idx + 1}. ${s.name}` }).addTo(layerRef.current);
      });
      const pts = stops.map((s) => [s.lat, s.lng]);
      map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
      setTimeout(() => map.invalidateSize(), 50);

      const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";");
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, { signal: ctrl.signal });
        clearTimeout(timer);
        const data = await res.json();
        const r = data && data.routes && data.routes[0];
        if (dead) return;
        if (!r) throw new Error("no route");
        const line = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        L.polyline(line, { color: "#073d3a", weight: 5, opacity: 0.9 }).addTo(layerRef.current);
        map.fitBounds(line, { padding: [36, 36], maxZoom: 16 });
        setInfo({ km: (r.distance / 1000).toFixed(1), min: Math.max(1, Math.round(r.duration / 60)), straight: false });
      } catch {
        if (dead) return;
        L.polyline(pts, { color: "#073d3a", weight: 3, opacity: 0.7, dashArray: "6 8" }).addTo(layerRef.current);
        setInfo({ straight: true });
      }
    })();
    return () => { dead = true; };
  }, [key]); // eslint-disable-line

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  return (
    <div style={{ marginTop: 14 }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h3>Route between your stops</h3>
        {info && !info.straight && <span className="small" style={{ fontWeight: 650 }}>{info.km} km, about {info.min} min by car</span>}
        {info && info.straight && <span className="small muted">Showing a straight line. Route times are not available right now.</span>}
      </div>
      <div ref={el} className="spotmap" style={{ height }} role="region" aria-label="Map of your date route" />
      {info && !info.straight && <p className="small muted" style={{ margin: "6px 0 0" }}>Driving time without traffic. Evenings in Colombo can take longer.</p>}
    </div>
  );
}
