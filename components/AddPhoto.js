"use client";
import { useRef, useState } from "react";
import { Ico } from "./Icon";
import { db } from "@/lib/data";
import { goLogin } from "@/lib/hooks";
import { compressImage } from "@/lib/photos";

// Visitors send a photo of the place; an admin checks it before it appears.
export default function AddPhoto({ spot, user }) {
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setMsg("");
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  const send = async () => {
    setBusy(true); setErr("");
    try {
      const blob = await compressImage(file, 1600, 0.82);
      await db.submitPhoto(spot.id, blob, caption);
      setMsg("Thanks! We check every photo first; yours will appear here soon.");
      setFile(null); setPreview(""); setCaption("");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="addphoto">
      {!file ? (
        <button type="button" className="btn sm ghost" onClick={() => (user ? input.current && input.current.click() : goLogin())}>
          <Ico n="plus" size={16} />Add a photo of {spot.name}
        </button>
      ) : (
        <div className="card pad addphoto-form">
          <img src={preview} alt="Your photo, ready to send" />
          <label className="field" style={{ marginBottom: 8 }}><span>What does it show? (optional)</span>
            <input className="input" value={caption} maxLength={140} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Cheese kottu, the outside seating" />
          </label>
          <p className="small muted" style={{ margin: "0 0 10px" }}>Only send photos you took. Please no faces of other people.</p>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn sm" onClick={send} disabled={busy}>{busy ? "Sending..." : "Send photo"}</button>
            <button type="button" className="btn sm ghost" onClick={() => { setFile(null); setPreview(""); }} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
      {msg && <div className="alert ok">{msg}</div>}
      {err && <div className="alert">{err}</div>}
    </div>
  );
}
