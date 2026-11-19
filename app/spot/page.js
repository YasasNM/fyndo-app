"use client";
import { Ico } from "@/components/Icon";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { priceParts, nowHHMM } from "@/components/SpotCard";
import { CONFIG } from "@/lib/config";
import GooglePanel from "@/components/GooglePanel";
import ReviewsPanel, { FeedbackBox } from "@/components/ReviewsPanel";
import MenuPanel from "@/components/MenuPanel";
import RewardsBox from "@/components/RewardsBox";
import FeatureChips from "@/components/FeatureChips";
import { RatingPill } from "@/components/Stars";
import { embedUrl, niceTime, priceLabel, waUrl, shareNow, isOpenAt } from "@/lib/utils";

import dynamic from "next/dynamic";
import PhotoGallery from "@/components/PhotoGallery";
import VenuePhoto from "@/components/VenuePhoto";
import { galleryPhotos } from "@/lib/photoInfo";
import { descriptionFor, descriptionReviewSource } from "@/lib/placeDescriptions";
import OfficialLinks from "@/components/OfficialLinks";
import AddPhoto from "@/components/AddPhoto";
import AddToList from "@/components/AddToList";
import { DealBanner } from "@/components/TodayDeals";
const SpotMap = dynamic(() => import("@/components/SpotMap"), { ssr: false, loading: () => <div className="skel" style={{ height: 240, borderRadius: 16 }} /> });
import { directionsUrl, photosUrl } from "@/lib/gmaps";

export default function SpotPageWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><SpotPage /></Suspense>;
}

function SpotPage() {
  const id = useSearchParams().get("id");
  const user = useUser();
  const [spot, setSpot] = useState(undefined);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  const [rating, setRating] = useState(null);

  useEffect(() => { db.getSpot(id).then(setSpot).catch(() => setSpot(null)); }, [id]);
  useEffect(() => { db.getRatings().then((r) => setRating(r[id] || null)).catch(() => {}); }, [id]);
  useEffect(() => { if (user) db.getSaves().then((l) => setSaved(l.includes(id))); }, [user, id]);

  if (spot === undefined) return <div className="loading">Loading...</div>;
  if (!spot) return <div className="empty"><div className="big"><Ico n="pin" size={30} /></div><h1 className="empty-title">This place was not found</h1><Link href="/" className="linkbtn">Go home</Link></div>;

  const embed = embedUrl(spot.video_url);
  const descriptionSource = descriptionReviewSource(spot);
  const toggle = async () => {
    if (!user) return goLogin();
    try { setSaved(await db.toggleSave(spot.id)); } catch (e) { setMsg(e.message); }
  };
  const share = async () => {
    const r = await shareNow({ title: `${spot.name} on Fyndo`, text: `Check out ${spot.name} (${spot.area}) on Fyndo:`, url: window.location.href });
    if (r === "shared") setMsg("");
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setMsg("Link copied."); } catch { setMsg("Could not copy. Copy the address bar instead."); }
  };

  return (
    <div className="two" style={{ marginTop: 16 }}>
      <div>
        {embed ? (
          <div className="video"><iframe src={embed} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title="Video review" /></div>
        ) : spot.photos && spot.photos.length ? (
          <div className="card" style={{ overflow: "hidden" }}><PhotoGallery photos={galleryPhotos(spot)} placeName={spot.name} /></div>
        ) : (
          <VenuePhoto className="spothero" />
        )}
        {embed && spot.photos && spot.photos.length > 0 && (
          <div className="card" style={{ overflow: "hidden", marginTop: 14 }}><PhotoGallery photos={galleryPhotos(spot)} placeName={spot.name} /></div>
        )}
        <div className="card pad small" style={{ marginTop: 14 }}>
          <a className="linkbtn" href={photosUrl(spot)} target="_blank" rel="noopener noreferrer"
            aria-label={`View Google Maps photos of ${spot.name}`}>
            <Ico n="map" size={16} /> View photos on Google Maps
          </a>
          <div className="muted" style={{ marginTop: 6 }}>Opens Google Maps; choose Photos on the venue page.</div>
        </div>
        <AddPhoto spot={spot} user={user} />
        {spot.google_place_id && <GooglePanel placeId={spot.google_place_id} admin={Boolean(user && user.role === "admin")} />}
        {!spot.google_place_id && user && user.role === "admin" && (
          <div className="card pad small" style={{ marginTop: 14 }}>
            <b>Admin note:</b> this place is not linked to Google, so there are no Google photos, ratings or hours here.{" "}
            <Link className="linkbtn" href="/admin">Link it in Admin</Link>
          </div>
        )}
      </div>
      <div>
        <Link href="/" className="small muted">All places</Link>
        <h1 style={{ marginTop: 6 }}>{spot.name}</h1>
        <div className="row small">
          {spot.verified && <span className="badge">Verified</span>}
          {spot.hidden_gem && <span className="badge gem">Hidden gem</span>}
          {spot.booking_enabled && <span className="badge book">Booking on</span>}
          <RatingPill rating={rating} />
        </div>
        {(() => {
          const open = isOpenAt(spot, nowHHMM());
          const price = priceParts(spot);
          return (
            <div className="spotboard">
              <div className="spotboard-left">
                <span className="pcard-area static">{open !== null && <i className={"pcard-state " + (open ? "open" : "closed")} aria-hidden="true" />}{spot.area}</span>
                <div className="small" style={{ marginTop: 8 }}>
                  <b>{spot.category}</b>{open !== null && `, ${open ? "open now" : "closed now"}`}
                  <div className="muted"><Ico n="clock" size={14} /> {open === null ? "Hours not added yet" : `${niceTime(spot.open_time)} to ${niceTime(spot.close_time)}`}</div>
                </div>
              </div>
              <div className="pcard-price spotprice" aria-label={priceLabel(spot)}>
                {price.big ? <b>{price.big}</b> : null}{price.unit && <span>{price.unit}</span>}
              </div>
            </div>
          );
        })()}
        <div className="row" style={{ gap: 6 }}>{spot.moods.map((m) => <span key={m} className="tag">{m}</span>)}</div>
        <p>{descriptionFor(spot)}</p>
        {descriptionSource && (
          <p className="small muted">Based on Google reviews · <a className="linkbtn" href={descriptionSource.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></p>
        )}
        {String(spot.id).startsWith("osm-") && (
          <p className="small muted">
            Place data © <a className="linkbtn" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, available under the{" "}
            <a className="linkbtn" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL</a>.
          </p>
        )}

        <DealBanner spot={spot} />
        <div className="actionbar">
          {spot.booking_enabled ? (
            <Link href={`/book?id=${spot.id}`} className="btn">{spot.booking_mode === "request" ? "Request a table" : "Book a table"}</Link>
          ) : spot.whatsapp ? (
            <a className="btn" href={waUrl(spot.whatsapp, `Hi! I found you on Fyndo. Can I book a table?`)} target="_blank" rel="noreferrer"><Ico n="chat" size={18} />WhatsApp</a>
          ) : spot.phone ? (
            <a className="btn" href={`tel:${spot.phone}`}><Ico n="phone" size={18} />Call</a>
          ) : (
            <a className="btn" href={directionsUrl(spot)} target="_blank" rel="noreferrer"><Ico n="map" size={18} />Directions</a>
          )}
          <button className="btn ghost" onClick={toggle} aria-pressed={saved}><Ico n="bookmark" size={18} style={saved ? { fill: "currentColor" } : undefined} />{saved ? "Saved" : "Save"}</button>
          <button className="btn ghost" onClick={share}><Ico n="share" size={18} />Share</button>
        </div>
        <div className="row small" style={{ gap: 16, marginTop: -6 }}>
          {(spot.booking_enabled || spot.whatsapp) && spot.phone && <a className="linkbtn" href={`tel:${spot.phone}`}>Call {spot.phone}</a>}
          {(spot.booking_enabled || spot.whatsapp || spot.phone) && <a className="linkbtn" href={directionsUrl(spot)} target="_blank" rel="noreferrer">Directions</a>}
          <button className="linkbtn" onClick={copyLink}>Copy link</button>
        </div>
        <AddToList spot={spot} user={user} />
        {msg && <div className={"alert" + (msg === "Link copied." ? " ok" : "")}>{msg}</div>}

        <FeatureChips ids={spot.features} />
        <MenuPanel spot={spot} />
        <OfficialLinks spot={spot} />
        <RewardsBox spot={spot} user={user} />
        {spot.lat != null && spot.lng != null && (
          <div style={{ marginTop: 18 }}>
            <SpotMap spots={[spot]} single height={240} />
            <div className="row small" style={{ marginTop: 6 }}>
              <a className="linkbtn" href={directionsUrl(spot)} target="_blank" rel="noreferrer">Directions in Google Maps</a>
            </div>
          </div>
        )}
        <ReviewsPanel spotId={spot.id} spot={spot} user={user} onChange={(l) => l.length && setRating({ avg: l.reduce((a, r) => a + r.rating, 0) / l.length, count: l.length })} />
        <FeedbackBox spotId={spot.id} user={user} />
        <p className="small muted" style={{ marginTop: 10 }}><Link className="linkbtn" href="/split">Split the bill with friends</Link></p>
        <p className="small muted" style={{ marginTop: 16 }}>
          Wrong info? <a className="linkbtn" href={waUrl(CONFIG.whatsapp, `Hi Fyndo, the info for ${spot.name} needs an update: `)} target="_blank" rel="noreferrer">Tell us</a>
        </p>
        {(!spot.owner_id || (spot.owner_paid_until && new Date(spot.owner_paid_until) < new Date())) && (
          <Link href={`/claim?id=${encodeURIComponent(spot.id)}`} className="claimcta">
            <Ico n="store" size={22} />
            <span><b>Own or run {spot.name}?</b><span className="small">Claim this page to update your menu, prices, photos and bookings.</span></span>
          </Link>
        )}
      </div>
    </div>
  );
}
