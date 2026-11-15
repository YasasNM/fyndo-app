import Link from "next/link";
import { priceLabel } from "@/lib/utils";

export const CAT_EMOJI = { Restaurant: "🍛", "Café": "☕", "Street Food": "🔥", Dessert: "🍨", Activity: "🌅" };

export function Thumb({ spot, className = "thumb", children }) {
  return (
    <div className={className} style={{ background: `linear-gradient(135deg, ${spot.color || "#FF8A1E"}, #0E3B3B)` }}>
      {CAT_EMOJI[spot.category] || "📍"}
      {children}
    </div>
  );
}

export default function SpotCard({ spot }) {
  return (
    <Link href={`/spot?id=${spot.id}`} className="card spot-card">
      <Thumb spot={spot}>
        <div className="tagl">
          {spot.verified && <span className="badge">Verified</span>}
          {spot.hidden_gem && <span className="badge gem">Hidden gem</span>}
        </div>
        {spot.video_url && <div className="play">▶</div>}
      </Thumb>
      <div className="body">
        <h3>{spot.name}</h3>
        <div className="small muted">{spot.area} · {spot.category}</div>
        <div className="small" style={{ marginTop: 4 }}>{priceLabel(spot)}</div>
        {spot.booking_enabled && <div className="small" style={{ color: "var(--teal)", fontWeight: 600, marginTop: 2 }}>📅 Book a table</div>}
      </div>
    </Link>
  );
}
