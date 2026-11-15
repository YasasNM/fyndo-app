"use client";
import { useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useSpots, useUser, goLogin } from "@/lib/hooks";
import { Thumb } from "@/components/SpotCard";
import { embedUrl, priceLabel } from "@/lib/utils";

// Swipe-style feed of place videos. Videos load only when tapped, so it is light on mobile data.
export default function Watch() {
  const { spots, error } = useSpots();
  const user = useUser();
  const [playing, setPlaying] = useState("");
  const [saved, setSaved] = useState({});
  const withVideo = (spots || []).filter((s) => embedUrl(s.video_url));

  const save = async (s) => {
    if (!user) return goLogin();
    try { const on = await db.toggleSave(s.id); setSaved((x) => ({ ...x, [s.id]: on })); } catch {}
  };

  return (
    <>
      <h1>Watch</h1>
      <p className="muted" style={{ marginTop: 0 }}>See how places really look. Tap to play.</p>
      {error && <div className="alert">{error}</div>}
      {!spots && !error && <div className="loading">Loading...</div>}
      {spots && withVideo.length === 0 && <div className="empty"><div className="big">🎬</div>No videos yet. Admins can add a TikTok, Reel or YouTube link to any place.</div>}
      <div className="reel-feed">
        {withVideo.map((s) => (
          <section key={s.id} className="reel">
            {playing === s.id ? (
              <div className="video"><iframe src={embedUrl(s.video_url)} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={`Video of ${s.name}`} /></div>
            ) : (
              <button className="reel-thumb" onClick={() => setPlaying(s.id)} aria-label={`Play video of ${s.name}`}>
                <Thumb spot={s} className="video empty"><div className="playbig">▶</div></Thumb>
              </button>
            )}
            <div className="row between" style={{ marginTop: 8 }}>
              <div><b>{s.name}</b><div className="small muted">{s.area} · {s.category} · {priceLabel(s)}</div></div>
              <div className="row">
                <button className="btn sm ghost" onClick={() => save(s)}>{saved[s.id] ? "★ Saved" : "☆ Save"}</button>
                <Link className="btn sm" href={`/spot?id=${s.id}`}>Open</Link>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
