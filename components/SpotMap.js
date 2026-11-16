"use client";
import { useEffect, useRef, useState } from "react";
import { CAT_ICON, ICON_MARKUP } from "@/components/Icon";
import { getMapsKey, loadGoogleMaps } from "@/lib/gmaps";

// Google map with a pin for every place (Maps JavaScript API).
// spots: array with lat/lng. me: optional { lat, lng }. height: px.
export default function SpotMap({ spots, me, height = 420 }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onAuth = () => setErr("Google rejected the map key. In Google Cloud, allow this website address on the browser key and turn on Maps JavaScript API.");
    window.addEventListener("fyndo-maps-auth", onAuth);
    return () => window.removeEventListener("fyndo-maps-auth", onAuth);
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const key = await getMapsKey();
        if (!key) { setErr("The map needs a Google browser key. Ask the Fyndo admin to add GOOGLE_MAPS_BROWSER_KEY."); return; }
        const maps = await loadGoogleMaps(key);
        const { Map, InfoWindow } = await maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await maps.importLibrary("marker");
        if (dead || !el.current) return;
        if (!mapRef.current) {
          mapRef.current = new Map(el.current, { center: { lat: 6.9, lng: 79.86 }, zoom: 12, mapId: "DEMO_MAP_ID",
            gestureHandling: "cooperative", streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false });
          infoRef.current = new InfoWindow();
        }
        const map = mapRef.current;
        markersRef.current.forEach((m) => (m.map = null));
        markersRef.current = [];
        const bounds = new maps.LatLngBounds();
        let n = 0;
        spots.filter((s) => s.lat != null && s.lng != null).forEach((s) => {
          const pin = document.createElement("div");
          pin.className = "fy-pin";
          pin.innerHTML = `<div style="background:${s.color || "#F6B800"}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0d2422" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)">${ICON_MARKUP[CAT_ICON[s.category] || "pin"]}</svg></div>`;
          const m = new AdvancedMarkerElement({ map, position: { lat: s.lat, lng: s.lng }, title: s.name, content: pin });
          m.addListener("click", () => {
            const box = document.createElement("div");
            const a = document.createElement("a");
            a.href = `/spot?id=${encodeURIComponent(s.id)}`; a.textContent = s.name; a.style.fontWeight = "700"; a.style.color = "#0b5f59";
            const sub = document.createElement("div");
            sub.textContent = `${s.area}, ${s.category}`; sub.style.fontSize = "12px"; sub.style.color = "#3b514e";
            box.append(a, sub);
            infoRef.current.setContent(box);
            infoRef.current.open({ map, anchor: m });
          });
          markersRef.current.push(m);
          bounds.extend({ lat: s.lat, lng: s.lng }); n++;
        });
        if (me) {
          const dot = document.createElement("div");
          dot.className = "me-dot"; dot.title = "You are here";
          markersRef.current.push(new AdvancedMarkerElement({ map, position: me, title: "You are here", content: dot }));
          bounds.extend(me); n++;
        }
        if (n === 1) { map.setCenter(bounds.getCenter()); map.setZoom(16); }
        else if (n > 1) map.fitBounds(bounds, 40);
        setErr("");
      } catch (e) { if (!dead) setErr(e.message || "Google Maps could not load."); }
    })();
    return () => { dead = true; };
  }, [spots, me]);

  return (
    <div>
      {err && <div className="alert">{err}</div>}
      <div ref={el} className="spotmap" style={{ height, display: err ? "none" : "block" }} role="region" aria-label="Map of places" />
    </div>
  );
}
