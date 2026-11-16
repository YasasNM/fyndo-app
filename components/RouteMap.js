"use client";
import GoogleEmbed from "./GoogleEmbed";

// Driving route between the stops of a date plan, drawn by Google Maps (Maps Embed API, free).
// Google shows the drive time on the map itself.
export default function RouteMap({ stops, height = 300 }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ marginBottom: 6 }}>Route between your stops</h3>
      <GoogleEmbed stops={stops} height={height} />
    </div>
  );
}
