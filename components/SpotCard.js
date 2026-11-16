"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { priceLabel, isOpenAt, niceTime } from "@/lib/utils";
import { RatingPill } from "@/components/Stars";
import { Ico, ICON_MARKUP, CAT_ICON } from "@/components/Icon";
import { coverFor } from "@/lib/coverPhotos";
import { photoMeta } from "@/lib/photoInfo";
import { googleDown } from "@/lib/api";

// Kept for old imports. Category icons are drawn in Icon.js now.
export const CAT_EMOJI = {};

// Pattern tile: the place's colour printed with its category. Used where no photo exists at all.
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
      {spot.photos && spot.photos[0] ? (
        <img className="tile-photo" src={spot.photos[0]} alt="" loading="lazy" />
      ) : (
        <span className="sticker"><Ico n={icon} size="60%" strokeWidth={1.6} /></span>
      )}
      {children}
    </div>
  );
}

export function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

// The image area of a card. Best photo first: Fyndo's own, then the real Google photo (fetched only when the card
// is near the screen), with an example photo of the same kind of place underneath until the real one arrives.
export function CardMedia({ spot, children }) {
  const [ownFail, setOwnFail] = useState(false);
  const own = !ownFail && spot.photos && spot.photos[0];
  const meta = own ? photoMeta(spot, own) : null;
  const ex = own ? null : coverFor(spot);
  // Google is asked only after the page has loaded, and not at all while it is paused (daily limit reached).
  const [gState, setG] = useState("wait"); // wait | loading | ok | none
  useEffect(() => { setG(spot.google_place_id && !own && !googleDown() ? "loading" : "none"); }, [spot.google_place_id, own]);
  const showingExample = !own && gState !== "ok" && ex && !ex.real;
  return (
    <div className="pcard-media" style={{ "--c": spot.color || "#F6B800" }}>
      {own ? <img className="pcard-img" src={own} alt="" loading="lazy" decoding="async" referrerPolicy={meta.external ? "no-referrer" : undefined} onError={() => setOwnFail(true)} />
        : ex ? <img className="pcard-img" src={ex.src} alt="" loading="lazy" decoding="async" />
        : <Thumb spot={spot} className="pcard-img tile-fill" />}
      {(gState === "loading" || gState === "ok") && (
        <img className={"pcard-img pcard-google" + (gState === "ok" ? " in" : "")} src={`/api/cover?id=${encodeURIComponent(spot.google_place_id)}&w=600`}
          alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setG("ok")} onError={() => setG("none")} />
      )}
      <div className="pcard-shade" />
      {showingExample && <span className="pcard-example">Example photo</span>}
      {gState === "ok" && <span className="pcard-example">Photo: Google</span>}
      {meta && meta.short && <span className="pcard-example">{meta.short}</span>}
      {children}
    </div>
  );
}

// rating: { avg, count }; distanceKm; why: string; pick: { on, toggle(id) } for Compare / Vote;
// save: { on, toggle(id) } shows a bookmark on the photo.
// The per-person price as a route-board number: "600–1,000" over "LKR per person".
export function priceParts(s) {
  const n = (x) => Number(x || 0).toLocaleString("en-US");
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
      <Link href={`/spot?id=${spot.id}`} className="pcard-link" aria-label={`${spot.name}, ${spot.area}, ${open ? "open now" : "closed"}, ${priceLabel(spot)}`}>
        <CardMedia spot={spot}>
          {/* Fixed cell: the area plate always carries the open/closed mark in the same corner. */}
          <span className="pcard-area"><i className={"pcard-state " + (open ? "open" : "closed")} aria-hidden="true" />{spot.area}</span>
        </CardMedia>
        <div className="pcard-body">
          <div className="pcard-main">
            <div className="pcard-namecol">
              <h3>{spot.name}</h3>
              <div className="pcard-sub">
                {spot.category}, {open ? `open till ${niceTime(spot.close_time)}` : "closed now"}{km && `, ${km}`}
              </div>
            </div>
            {price.big ? (
              <div className="pcard-price"><b>{price.big}</b>{price.unit && <span>{price.unit}</span>}</div>
            ) : <div className="pcard-price none"><span>{price.unit}</span></div>}
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
      {save && (
        <button type="button" className={"pcard-save" + (save.on ? " on" : "")} aria-pressed={save.on}
          aria-label={save.on ? `Remove ${spot.name} from saved` : `Save ${spot.name}`} onClick={() => save.toggle(spot.id)}>
          <Ico n="bookmark" size={18} strokeWidth={2} />
        </button>
      )}
      {pick && (
        <button type="button" className={"pcard-pick" + (pick.on ? " on" : "")} aria-pressed={pick.on}
          aria-label={pick.on ? `Remove ${spot.name} from compare` : `Add ${spot.name} to compare or vote`} onClick={() => pick.toggle(spot.id)}>
          <Ico n={pick.on ? "check" : "plus"} size={14} strokeWidth={2.4} />{pick.on ? "Added" : "Compare"}
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
