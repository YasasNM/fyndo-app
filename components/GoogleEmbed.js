"use client";
import { useEffect, useState } from "react";
import { getMapsKey, embedPlaceUrl, embedRouteUrl, directionsUrl, routeUrl } from "@/lib/gmaps";

// Google's embedded map (Maps Embed API: free, no usage limit).
// Pass `spot` for one place, or `stops` (2+ places in order) for a driving route.
export default function GoogleEmbed({ spot, stops, height = 260, title }) {
  const [key, setKey] = useState(undefined);
  useEffect(() => { getMapsKey().then(setKey); }, []);
  const route = Array.isArray(stops) && stops.length >= 2;
  const openUrl = route ? routeUrl(stops) : directionsUrl(spot);

  if (key === undefined) return <div className="skel" style={{ height, borderRadius: 16 }} />;
  return (
    <div>
      {key ? (
        <iframe
          className="spotmap gembed"
          style={{ height }}
          title={title || (route ? "Route between your stops on Google Maps" : `${spot.name} on Google Maps`)}
          src={route ? embedRouteUrl(key, stops) : embedPlaceUrl(key, spot)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="card pad small muted">The map needs a Google browser key. Ask the Fyndo admin to add GOOGLE_MAPS_BROWSER_KEY.</div>
      )}
      <div className="row small" style={{ marginTop: 6 }}>
        <a className="linkbtn" href={openUrl} target="_blank" rel="noreferrer">{route ? "Open the route in Google Maps" : "Directions in Google Maps"}</a>
      </div>
    </div>
  );
}
