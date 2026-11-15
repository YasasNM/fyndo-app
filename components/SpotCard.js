import { useId } from "react";
import Link from "next/link";
import { priceLabel, isOpenAt } from "@/lib/utils";
import { RatingPill } from "@/components/Stars";
import { Ico, ICON_MARKUP, CAT_ICON } from "@/components/Icon";

// Kept for old imports. Category icons are drawn in Icon.js now.
export const CAT_EMOJI = {};

// Cover tile: the place's own colour, printed with a repeating drawing of its category, and a sticker on top.
export function Thumb({ spot, className = "thumb", children }) {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const icon = CAT_ICON[spot.category] || "pin";
  return (
    <div className={className + " tile"} style={{ "--c": spot.color || "#F6B800" }}>
      <svg className="tile-art" aria-hidden="true" focusable="false">
        <defs>
          <pattern id={"p" + uid} width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
            <g transform="translate(20 6) scale(1.1)" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: ICON_MARKUP[icon] }} />
            <g transform="translate(-12 38) scale(0.9)" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: ICON_MARKUP[icon] }} />
            <g transform="translate(46 38) scale(0.9)" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: ICON_MARKUP[icon] }} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p${uid})`} />
      </svg>
      <span className="sticker"><Ico n={icon} size="60%" strokeWidth={1.6} /></span>
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
        {spot.video_url && <div className="play" aria-label="Has video"><Ico n="play" size={14} /></div>}
        {pick && (
          <button type="button" className={"pickbtn" + (pick.on ? " on" : "")} aria-pressed={pick.on}
            aria-label={pick.on ? `Remove ${spot.name} from selection` : `Select ${spot.name} to compare or vote`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); pick.toggle(spot.id); }}>
            <Ico n={pick.on ? "check" : "plus"} size={16} strokeWidth={2.4} />
          </button>
        )}
      </Thumb>
      <div className="body">
        <div className="card-top">
          <h3>{spot.name}</h3>
          <b className="card-price">{priceLabel(spot)}</b>
        </div>
        <div className="card-meta">
          <span className="meta"><Ico n="pin" size={14} />{spot.area}{distanceKm != null && ` (${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km)`}</span>
          <span className="tag">{spot.category}</span>
        </div>
        <div className="card-foot">
          <span className={open ? "open-now" : "closed-now"}>{open ? "Open now" : "Closed"}</span>
          <RatingPill rating={rating} />
          {spot.booking_enabled && <span className="meta"><Ico n="calendar" size={14} />Bookable</span>}
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
