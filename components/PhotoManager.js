"use client";
import { useRef, useState } from "react";
import { db } from "@/lib/data";
import { compressImage } from "@/lib/photos";
import { Ico } from "./Icon";

// Add or remove Fyndo's own photos for a place. The first photo is the cover on cards.
export default function PhotoManager({ spot, onChange }) {
  const [photos, setPhotos] = useState(spot.photos || []);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const input = useRef(null);
  const update = (list) => { setPhotos(list); onChange && onChange(list); };

  const add = async (files) => {
    setErr("");
    const list = [...files].slice(0, Math.max(0, 12 - photos.length));
    if (!list.length) return setErr("Up to 12 photos per place.");
    let cur = photos;
    for (let i = 0; i < list.length; i++) {
      setBusy(`Uploading ${i + 1} of ${list.length}...`);
      try {
        const blob = await compressImage(list[i]);
        cur = await db.addSpotPhoto(spot.id, blob, cur);
        update(cur);
      } catch (e) { setErr(e.message); break; }
    }
    setBusy("");
    if (input.current) input.current.value = "";
  };

  const remove = async (index) => {
    if (!window.confirm("Remove this photo?")) return;
    setErr(""); setBusy("Removing...");
    try { update(await db.removeSpotPhoto(spot.id, photos[index], photos, index)); } catch (e) { setErr(e.message); }
    setBusy("");
  };
  const makeCover = async (index) => {
    const list = [photos[index], ...photos.filter((_, k) => k !== index)];
    try { await db.updateSpot(spot.id, { photos: list }); update(list); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="field">
      <span>Photos ({photos.length}/12)</span>
      {!spot.id && <p className="small muted" style={{ margin: 0 }}>Save the place first, then add photos.</p>}
      {spot.id && (
        <>
          <div className="photogrid">
            {photos.map((u, i) => (
              <div key={i + ":" + u.slice(-24)} className="photocell">
                <img src={u} alt={`Photo ${i + 1} of ${spot.name}`} loading="lazy" />
                {i === 0 ? <span className="badge" style={{ position: "absolute", left: 6, top: 6 }}>Cover</span>
                  : <button type="button" className="linkbtn photobtn l" onClick={() => makeCover(i)}>Make cover</button>}
                <button type="button" className="photobtn r" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}><Ico n="close" size={16} /></button>
              </div>
            ))}
            {photos.length < 12 && (
              <button type="button" className="photoadd" onClick={() => input.current && input.current.click()} disabled={Boolean(busy)}>
                <Ico n="plus" size={22} /><span className="small">Add photos</span>
              </button>
            )}
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
          {busy && <div className="small muted" style={{ marginTop: 6 }}>{busy}</div>}
          {err && <div className="alert">{err}</div>}
          <p className="small muted" style={{ margin: "6px 0 0" }}>Use your own photos or ones the owner gave you permission to use. Photos are shrunk before upload.</p>
        </>
      )}
    </div>
  );
}
