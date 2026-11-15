import Link from "next/link";
import { priceLabel, isOpenAt } from "@/lib/utils";
import { RatingPill } from "@/components/Stars";

export const CAT_EMOJI = { Restaurant: "🍛", "Café": "☕", "Street Food": "🔥", Dessert: "🍨", Activity: "🌅" };

export function Thumb({ spot, className = "thumb", children }) {
  return (
    <div className={className} style={{ background: `linear-gradient(135deg, ${spot.color || "#FF8A1E"}, #0E3B3B)` }}>
      {CAT_EMOJI[spot.category] || "📍"}
      {children}
    </div>
  );
}

function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

// rating: { avg, count } (optional), distanceKm: number (optional), why: string (optional)
// pick: { on, toggle(id) } shows a small tick to select the card for Compare / Vote.
export default function SpotCard({ spot, rating, distanceKm, why, pick }) {
  const open = isOpenAt(spot, nowHHMM());
  return (
    <Link href={`/spot?id=${spot.id}`} className="card spot-card">
      <Thumb spot={spot}>
        <div className="tagl">
          {spot.verified && <span className="badge">Verified</span>}
          {spot.hidden_gem && <span className="badge gem">Hidden gem</span>}
        </div>
        {spot.video_url && <div className="play">▶</div>}
        {pick && (
          <button type="button" className={"pickbtn" + (pick.on ? " on" : "")} aria-pressed={pick.on}
            aria-label={pick.on ? `Remove ${spot.name} from selection` : `Select ${spot.name} to compare or vote`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); pick.toggle(spot.id); }}>{pick.on ? "✓" : "+"}</button>
        )}
      </Thumb>
      <div className="body">
        <h3>{spot.name}</h3>
        <div className="small muted">{spot.area} · {spot.category}{distanceKm != null && <> · {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km</>}</div>
        <div className="row small" style={{ marginTop: 4, gap: 8 }}>
          <span>{priceLabel(spot)}</span>
          <RatingPill rating={rating} />
        </div>
        <div className="row small" style={{ marginTop: 2, gap: 10 }}>
          <span className={open ? "open-now" : "closed-now"}>{open ? "● Open now" : "● Closed"}</span>
          {spot.booking_enabled && <span style={{ color: "var(--head)", fontWeight: 600 }}>📅 Bookable</span>}
        </div>
        {why && <div className="small why">{why}</div>}
      </div>
    </Link>
  );
}

export function SkeletonGrid({ n = 6 }) {
  return (
    <div className="grid">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card skel-card"><div className="skel thumb-skel" /><div className="body"><div className="skel line" style={{ width: "70%" }} /><div className="skel line" style={{ width: "45%" }} /></div></div>
      ))}
    </div>
  );
}
