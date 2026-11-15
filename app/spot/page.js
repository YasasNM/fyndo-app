"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { Thumb } from "@/components/SpotCard";
import { CONFIG } from "@/lib/config";
import GooglePanel from "@/components/GooglePanel";
import { embedUrl, lkr, mapsUrl, niceTime, priceLabel, waUrl, shareWa } from "@/lib/utils";

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

  useEffect(() => { db.getSpot(id).then(setSpot).catch(() => setSpot(null)); }, [id]);
  useEffect(() => { if (user) db.getSaves().then((l) => setSaved(l.includes(id))); }, [user, id]);

  if (spot === undefined) return <div className="loading">Loading...</div>;
  if (!spot) return <div className="empty"><div className="big">📍</div>This spot was not found. <Link href="/" className="linkbtn">Go home</Link></div>;

  const embed = embedUrl(spot.video_url);
  const toggle = async () => {
    if (!user) return goLogin();
    try { setSaved(await db.toggleSave(spot.id)); } catch (e) { setMsg(e.message); }
  };
  const shareText = `Check out ${spot.name} (${spot.area}) on Fyndo: ${typeof window !== "undefined" ? window.location.href : ""}`;

  return (
    <div className="two" style={{ marginTop: 16 }}>
      <div>
        {embed ? (
          <div className="video"><iframe src={embed} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title="Video review" /></div>
        ) : (
          <Thumb spot={spot} className="video empty"><div className="small" style={{ marginTop: 6, opacity: 0.85 }}>Video coming soon</div></Thumb>
        )}
        {spot.google_place_id && <GooglePanel placeId={spot.google_place_id} onInfo={setGInfo} />}
      </div>
      <div>
        <Link href="/" className="small muted">← All spots</Link>
        <h1 style={{ marginTop: 6 }}>{spot.name}</h1>
        <div className="row small">
          {spot.verified && <span className="badge">Verified</span>}
          {spot.hidden_gem && <span className="badge gem">Hidden gem</span>}
          {spot.booking_enabled && <span className="badge book">Booking on</span>}
        </div>
        <p className="muted" style={{ margin: "8px 0" }}>
          {spot.area} · {spot.category} · {priceLabel(spot)}<br />
          Open {niceTime(spot.open_time)} to {niceTime(spot.close_time)}
        </p>
        <div className="chips">{spot.moods.map((m) => <span key={m} className="chip">{m}</span>)}</div>
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
          <a className="btn ghost" href={(gInfo && gInfo.mapsUrl) || mapsUrl(spot)} target="_blank" rel="noreferrer">Map</a>
          <button className="btn ghost" onClick={toggle}>{saved ? "★ Saved" : "☆ Save"}</button>
          <a className="btn ghost" href={shareWa(shareText)} target="_blank" rel="noreferrer">Share</a>
        </div>
        {msg && <div className="alert">{msg}</div>}

        {spot.menu && spot.menu.length > 0 && (
          <>
            <h2>Menu & prices</h2>
            <div className="card pad">
              {spot.menu.map((m, i) => (
                <div key={i} className="menu-row"><span>{m.item}</span><b>{lkr(m.price)}</b></div>
              ))}
              {spot.menu_updated_at && <div className="small muted" style={{ marginTop: 8 }}>Prices checked on {spot.menu_updated_at}</div>}
            </div>
          </>
        )}
        <p className="small muted" style={{ marginTop: 16 }}>
          Wrong info? <a className="linkbtn" href={waUrl(CONFIG.whatsapp, `Hi Fyndo, the info for ${spot.name} needs an update: `)} target="_blank" rel="noreferrer">Tell us</a>
        </p>
      </div>
    </div>
  );
}
