"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/data";
import { goLogin } from "@/lib/hooks";
import Stars from "@/components/Stars";

function ago(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "today";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Fyndo's own reviews (separate from the live Google section).
export default function ReviewsPanel({ spotId, user }) {
  const [list, setList] = useState(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  const load = () => db.getReviews(spotId).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, [spotId]); // eslint-disable-line

  const mine = user && list ? list.find((r) => r.user_id === user.id) : null;
  useEffect(() => { if (mine) { setRating(mine.rating); setBody(mine.body || ""); } }, [mine && mine.id]); // eslint-disable-line

  const avg = list && list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return goLogin();
    if (!rating) return setMsg("Tap the stars to rate first.");
    setBusy(true); setMsg("");
    try { await db.saveReview(spotId, rating, body); await load(); setOpen(false); setMsg("Thanks! Your review is saved."); }
    catch (err) { setMsg(err.message); }
    setBusy(false);
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try { await db.deleteReview(id); setRating(0); setBody(""); await load(); } catch (err) { setMsg(err.message); }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div className="row between">
        <h2 style={{ margin: "18px 0 6px" }}>Fyndo reviews</h2>
        {list && list.length > 0 && (
          <div className="row small" style={{ gap: 6 }}><b style={{ fontSize: 18 }}>{avg.toFixed(1)}</b><Stars value={avg} /><span className="muted">({list.length})</span></div>
        )}
      </div>

      {msg && <div className={"alert" + (msg.startsWith("Thanks") ? " ok" : "")}>{msg}</div>}

      {!open ? (
        <button className="btn ghost sm" onClick={() => (user ? setOpen(true) : goLogin())}>
          {mine ? "Edit your review" : "★ Write a review"}
        </button>
      ) : (
        <form className="card pad" onSubmit={submit}>
          <div className="field"><span>Your rating</span><Stars value={rating} onChange={setRating} size={30} /></div>
          <label className="field"><span>Your review (optional)</span>
            <textarea className="input" rows={3} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="What did you eat? Was it worth the price?" />
            <div className="small muted" style={{ textAlign: "right" }}>{body.length}/600</div>
          </label>
          <div className="row">
            <button className="btn sm" disabled={busy}>{busy ? "Saving..." : "Post review"}</button>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {list === null && <div className="skel line" style={{ width: "60%", marginTop: 12 }} />}
      {list && list.length === 0 && <p className="small muted" style={{ marginTop: 10 }}>No reviews yet. Be the first to share your visit.</p>}
      {list && list.map((r) => (
        <div key={r.id} className="review">
          <div className="row between">
            <span className="row" style={{ gap: 8 }}><b>{r.author}</b><Stars value={r.rating} size={14} /></span>
            <span className="small muted">{ago(r.created_at)}</span>
          </div>
          {r.body && <p style={{ margin: "4px 0 0" }}>{r.body}</p>}
          {user && (r.user_id === user.id || user.role === "admin") && (
            <button className="linkbtn" style={{ color: "var(--chili)", marginTop: 4 }} onClick={() => remove(r.id)}>Delete</button>
          )}
        </div>
      ))}
    </div>
  );
}
