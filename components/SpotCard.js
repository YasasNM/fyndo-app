"use client";
import Link from "next/link";
import { priceLabel, isOpenAt, niceTime } from "@/lib/utils";
import { RatingPill } from "@/components/Stars";
import { Ico } from "@/components/Icon";
import VenuePhoto from "@/components/VenuePhoto";
import { photoMeta } from "@/lib/photoInfo";
import { photosUrl } from "@/lib/gmaps";

// Kept for old imports. Category icons are drawn in Icon.js now.
export const CAT_EMOJI = {};

// Compact and full-sized venue thumbnails share the same honest photo empty state.
export function Thumb({ spot, className = "thumb", children }) {
  const src = spot.photos?.[0];
  const meta = src ? photoMeta(spot, src) : null;
  return <VenuePhoto src={src} alt={src ? `Photo of ${spot.name}` : ""} className={className} external={meta?.external}>{children}</VenuePhoto>;
}

export function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

// Only the venue's own photo is displayed; Google Maps photos open via the explicit link.
export function CardMedia({ spot, children }) {
  const src = spot.photos?.[0];
  const meta = src ? photoMeta(spot, src) : null;
  return (
    <div className="pcard-media">
      <VenuePhoto src={src} alt={src ? `Photo of ${spot.name}` : ""} className="pcard-img" external={meta?.external} />
      {meta?.short && <span className="pcard-example">{meta.short}</span>}
      {children}
    </div>
  );
}

// rating: { avg, count }; distanceKm; why: string; pick: { on, toggle(id) } for Compare / Vote;
// save: { on, toggle(id) } shows a bookmark on the photo.
// The per-person price as a route-board number: "600–1,000" over "LKR per person".
export function priceParts(s) {
  const n = (x) => Number(x || 0).toLocaleString("en-US");
  const label = priceLabel(s);
  if (!s.price_max && label.startsWith("Reported ")) return { big: "", unit: label, reported: true };
  if (!s.price_max) return s.category === "Activity" ? { big: "Free", unit: "" } : { big: "", unit: "Prices not added yet" };
  return { big: s.price_min === s.price_max || !s.price_min ? n(s.price_max) : `${n(s.price_min)}–${n(s.price_max)}`, unit: "LKR per person" };
}

// inGems: the card sits inside the "Hidden gems" row, so its own gem mark would say it twice.
export default function SpotCard({ spot, rating, distanceKm, why, pick, save, inGems = false }) {
  const open = isOpenAt(spot, nowHHMM());
  const gem = spot.hidden_gem && !inGems;
  const price = priceParts(spot);
  const km = distanceKm != null ? `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km` : "";
  return (
    <article className="pcard">
      <Link href={`/spot?id=${spot.id}`} className="pcard-link" aria-label={`${spot.name}, ${spot.area}, ${open === null ? "Hours not added yet" : open ? "open now" : "closed"}, ${priceLabel(spot)}`}>
        <CardMedia spot={spot} />
        <div className="pcard-body">
          <div className="pcard-namecol">
            <h3>{spot.name}</h3>
            <div className="pcard-sub">{spot.area}, {spot.category}{km && `, ${km}`}</div>
          </div>
          <div className="pcard-main">
            <span className={open === null ? "muted" : open ? "open-now" : "closed-now"}>{open === null ? "Hours not added yet" : open ? `Open till ${niceTime(spot.close_time)}` : "Closed now"}</span>
            {price.reported ? <span className="pcard-price reported"><span>{price.unit}</span></span> : price.big ? (
              <span className="pcard-price"><b>{price.big === "Free" ? "Free" : `LKR ${price.big}`}</b>{price.unit && <span> pp</span>}</span>
            ) : <span className="pcard-price none"><span>No prices yet</span></span>}
          </div>
          {(spot.verified || gem || rating || spot.booking_enabled || spot.video_url) && (
            <div className="pcard-marks">
              {spot.verified && <span className="mark ok"><Ico n="check" size={13} strokeWidth={2.4} />Verified</span>}
              {gem && <span className="mark gem"><Ico n="gem" size={13} />Hidden gem</span>}
              <RatingPill rating={rating} />
              {spot.booking_enabled && <span className="mark"><Ico n="calendar" size={13} />Bookable</span>}
              {spot.video_url && <span className="mark"><Ico n="play" size={12} />Video</span>}
            </div>
          )}
          {why && <div className="small why">{why}</div>}
        </div>
      </Link>
      <div className="pcard-actions">
        <a className="linkbtn" href={photosUrl(spot)} target="_blank" rel="noopener noreferrer"
          aria-label={`View Google Maps photos of ${spot.name}`} title="Opens Google Maps; choose Photos on the venue page">
          View photos on Google Maps
        </a>
        {pick && (
          <button type="button" className={"pcard-pick" + (pick.on ? " on" : "")} aria-pressed={pick.on}
            aria-label={pick.on ? `Remove ${spot.name} from compare` : `Add ${spot.name} to compare or vote`} onClick={() => pick.toggle(spot.id)}>
            <Ico n={pick.on ? "check" : "plus"} size={14} strokeWidth={2.4} />{pick.on ? "Added" : "Compare"}
          </button>
        )}
      </div>
      {save && (
        <button type="button" className={"pcard-save" + (save.on ? " on" : "")} aria-pressed={save.on}
          aria-label={save.on ? `Remove ${spot.name} from saved` : `Save ${spot.name}`} onClick={() => save.toggle(spot.id)}>
          <Ico n="bookmark" size={18} strokeWidth={2} />
        </button>
      )}
    </article>
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
