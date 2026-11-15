"use client";
import { Ico } from "@/components/Icon";
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { Thumb } from "@/components/SpotCard";
import { CONFIG } from "@/lib/config";
import GooglePanel from "@/components/GooglePanel";
import ReviewsPanel, { FeedbackBox } from "@/components/ReviewsPanel";
import MenuPanel from "@/components/MenuPanel";
import RewardsBox from "@/components/RewardsBox";
import FeatureChips from "@/components/FeatureChips";
import { RatingPill } from "@/components/Stars";
import { embedUrl, mapsUrl, niceTime, priceLabel, waUrl, shareNow } from "@/lib/utils";

const SpotMap = dynamic(() => import("@/components/SpotMap"), { ssr: false, loading: () => <div className="skel" style={{ height: 240, borderRadius: 16 }} /> });

export default function SpotPageWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><SpotPage /></Suspense>;
}

function SpotPage() {
  const id = useSearchParams().get("id");
  const user = useUser();
  const [spot, setSpot] = useState(undefined);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  const [gInfo, setGInfo] = useState(null);
  const [rating, setRating] = useState(null);

  useEffect(() => { db.getSpot(id).then(setSpot).catch(() => setSpot(null)); }, [id]);
  useEffect(() => { db.getRatings().then((r) => setRating(r[id] || null)).catch(() => {}); }, [id]);
  useEffect(() => { if (user) db.getSaves().then((l) => setSaved(l.includes(id))); }, [user, id]);

  if (spot === undefined) return <div className="loading">Loading...</div>;
  if (!spot) return <div className="empty"><div className="big"><Ico n="pin" size={30} /></div>This spot was not found. <Link href="/" className="linkbtn">Go home</Link></div>;

  const embed = embedUrl(spot.video_url);
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
        ) : (
          <Thumb spot={spot} className="video empty"><div className="small" style={{ marginTop: 10, position: "relative", zIndex: 1, color: "#fff", fontWeight: 600 }}>Video coming soon</div></Thumb>
        )}
        {spot.google_place_id && <GooglePanel placeId={spot.google_place_id} onInfo={setGInfo} />}
      </div>
      <div>
        <Link href="/" className="small muted">All spots</Link>
        <h1 style={{ marginTop: 6 }}>{spot.name}</h1>
        <div className="row small">
          {spot.verified && <span className="badge">Verified</span>}
          {spot.hidden_gem && <span className="badge gem">Hidden gem</span>}
          {spot.booking_enabled && <span className="badge book">Booking on</span>}
          <RatingPill rating={rating} />
        </div>
        <div className="facts">
          <div><Ico n="pin" size={18} />{spot.area}<span className="tag">{spot.category}</span></div>
          <div><Ico n="receipt" size={18} />{priceLabel(spot)}</div>
          <div><Ico n="clock" size={18} />Open {niceTime(spot.open_time)} to {niceTime(spot.close_time)}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>{spot.moods.map((m) => <span key={m} className="tag">{m}</span>)}</div>
        <p>{spot.about}</p>

        <div className="actionbar">
          {spot.booking_enabled ? (
            <Link href={`/book?id=${spot.id}`} className="btn">{spot.booking_mode === "request" ? "Request a table" : "Book a table"}</Link>
          ) : (
            <>
              {spot.whatsapp && <a className="btn" href={waUrl(spot.whatsapp, `Hi! I found you on Fyndo. Can I book a table?`)} target="_blank" rel="noreferrer">WhatsApp</a>}
              {spot.phone && <a className="btn ghost" href={`tel:${spot.phone}`}>Call</a>}
            </>
          )}
          <a className="btn ghost" href={(gInfo && gInfo.mapsUrl) || mapsUrl(spot)} target="_blank" rel="noreferrer"><Ico n="map" size={18} />Open map</a>
          <button className="btn ghost" onClick={toggle}><Ico n="bookmark" size={18} style={saved ? { fill: "currentColor" } : undefined} />{saved ? "Saved" : "Save"}</button>
          <button className="btn ghost" onClick={share}>Share</button>
          <button className="btn ghost" onClick={copyLink} aria-label="Copy link"><Ico n="link" size={18} /></button>
        </div>
        {msg && <div className={"alert" + (msg === "Link copied." ? " ok" : "")}>{msg}</div>}

        <FeatureChips ids={spot.features} />
        <MenuPanel spot={spot} />
        <RewardsBox spot={spot} user={user} />
        {spot.lat != null && spot.lng != null && (
          <div style={{ marginTop: 18 }}>
            <SpotMap spots={[spot]} single height={240} />
            <div className="row small" style={{ marginTop: 6 }}>
              <a className="linkbtn" href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`} target="_blank" rel="noreferrer">Directions (Google Maps)</a>
              <a className="linkbtn" href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}#map=17/${spot.lat}/${spot.lng}`} target="_blank" rel="noreferrer">OpenStreetMap</a>
            </div>
          </div>
        )}
        <ReviewsPanel spotId={spot.id} user={user} onChange={(l) => l.length && setRating({ avg: l.reduce((a, r) => a + r.rating, 0) / l.length, count: l.length })} />
        <FeedbackBox spotId={spot.id} user={user} />
        <p className="small muted" style={{ marginTop: 10 }}><Link className="linkbtn" href="/split">Split the bill with friends</Link></p>
        <p className="small muted" style={{ marginTop: 16 }}>
          Wrong info? <a className="linkbtn" href={waUrl(CONFIG.whatsapp, `Hi Fyndo, the info for ${spot.name} needs an update: `)} target="_blank" rel="noreferrer">Tell us</a>
        </p>
      </div>
    </div>
  );
}
