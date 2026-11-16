"use client";
import { Ico } from "./Icon";
import { useEffect, useState } from "react";
import { googlePlace, photoSrc } from "@/lib/api";
import PhotoGallery from "./PhotoGallery";

// Live info from Google for a spot that has a google_place_id.
// Follows Google's display rules: "Google Maps" attribution, photo and review authors credited,
// links back to Google Maps, review order notice.
export default function GooglePanel({ placeId, onInfo, onFail, admin }) {
  const [g, setG] = useState(undefined);
  const [reviews, setReviews] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showHours, setShowHours] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let on = true;
    googlePlace(placeId).then((d) => { if (on) { setG(d); onInfo && onInfo(d); } }).catch((e) => { if (on) { setG(null); setLoadErr(e.message); onFail && onFail(); } });
    return () => { on = false; };
  }, [placeId]); // eslint-disable-line

  if (g === undefined) return <div className="card pad small muted gpanel">Loading info from Google Maps...</div>;
  if (g === null) {
    // Visitors just don't see the panel. Admins see why, so setup problems are easy to find.
    return admin ? <div className="alert gpanel">Google info is hidden: {loadErr || "no reply from the server"}. Open Admin and look at the Setup check.</div> : null;
  }

  const loadReviews = async () => {
    setBusy(true); setErr("");
    try { setReviews((await googlePlace(placeId, true)).reviews || []); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="card gpanel">
      {g.photos && g.photos.length > 0 ? (
        <PhotoGallery photos={g.photos} placeName={g.name || "this place"} />
      ) : g.photo && (
        <a href={g.photo.mapsUrl} target="_blank" rel="noreferrer" className="gphoto">
          <img src={photoSrc(g.photo.name, 900)} alt={`Photo of ${g.name}`} loading="lazy" />
          {g.photo.author && <span className="gcredit">Photo: {g.photo.author}</span>}
        </a>
      )}
      <div className="pad">
        <div className="row between">
          <b>On Google Maps</b>
          {g.rating && <span className="grating">{g.rating.toFixed(1)} of 5 <span className="muted small">({g.ratingCount.toLocaleString("en-US")})</span></span>}
        </div>
        {g.openNow !== null && (
          <div className="small" style={{ color: g.openNow ? "var(--green)" : "var(--chili)", fontWeight: 600, marginTop: 4 }}>
            {g.openNow ? "Open now" : "Closed now"}
          </div>
        )}
        {g.address && <div className="small" style={{ marginTop: 4 }}><Ico n="pin" size={14} /> {g.address}</div>}
        <div className="row small" style={{ marginTop: 6, gap: 14 }}>
          {g.phone && <a className="linkbtn" href={`tel:${g.phone.replace(/\s/g, "")}`}><Ico n="phone" size={14} /> {g.phone}</a>}
          {g.website && <a className="linkbtn" href={g.website} target="_blank" rel="noreferrer"><Ico n="globe" size={14} /> Website</a>}
          {g.hours.length > 0 && <button className="linkbtn" onClick={() => setShowHours(!showHours)}><Ico n="clock" size={14} /> {showHours ? "Hide" : "Opening"} hours</button>}
        </div>
        {showHours && <div className="small" style={{ marginTop: 6 }}>{g.hours.map((h) => <div key={h}>{h}</div>)}</div>}

        {reviews === null ? (
          <button className="btn sm ghost" style={{ marginTop: 12 }} onClick={loadReviews} disabled={busy}>
            {busy ? "Loading..." : "Show Google reviews"}
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            {reviews.length === 0 && <div className="small muted">No Google reviews yet.</div>}
            {reviews.map((r, i) => (
              <div key={i} className="greview">
                <div className="row" style={{ gap: 8 }}>
                  {r.authorPhoto ? <img src={r.authorPhoto} alt="" className="gavatar" referrerPolicy="no-referrer" /> : <span className="gavatar"><Ico n="user" size={16} /></span>}
                  <div>
                    <a href={r.authorUrl || r.url} target="_blank" rel="noreferrer" className="small" style={{ fontWeight: 600 }}>{r.author}</a>
                    <div className="small muted">{Math.round(r.rating || 0)} of 5, {r.when}</div>
                  </div>
                </div>
                <p className="small" style={{ margin: "6px 0 2px" }}>{r.text.length > 320 ? r.text.slice(0, 320) + "..." : r.text}</p>
                <div className="small">
                  {r.translated && <span className="muted">Translated by Google · </span>}
                  <a className="linkbtn" href={r.url} target="_blank" rel="noreferrer">Read on Google Maps</a>
                </div>
              </div>
            ))}
            <p className="small muted" style={{ marginTop: 8 }}>
              Up to 5 reviews from Google, shown in Google's "most relevant" order.{" "}
              <a className="linkbtn" href="https://support.google.com/contributionpolicy/answer/7400114" target="_blank" rel="noreferrer">Google's review policy</a>
            </p>
          </div>
        )}
        {err && <div className="alert">{err}</div>}
        <div className="gattr">
          <a href={g.mapsUrl} target="_blank" rel="noreferrer">View on Google Maps</a>
          <span aria-label="Google Maps">Google Maps</span>
        </div>
      </div>
    </div>
  );
}
