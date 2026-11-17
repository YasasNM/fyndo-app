"use client";
import { Ico } from "./Icon";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/data";
import { goLogin } from "@/lib/hooks";
import { REVIEW_TAGS, VISIT_TYPES, visitLabel } from "@/lib/features";
import Stars from "@/components/Stars";
import Link from "next/link";
import Avatar from "./Avatar";
import ShareSheet from "./ShareSheet";
import { reviewCard } from "@/lib/sharecard";

function ago(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "today";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
const tagLabel = (id) => (REVIEW_TAGS.find((t) => t.id === id) || { label: id }).label;

// Fyndo's own reviews (separate from the live Google section).
export default function ReviewsPanel({ spotId, spot, user, onChange }) {
  const [list, setList] = useState(null);
  const [liked, setLiked] = useState([]);
  const reviewIds = list ? list.map((r) => r.id).join(",") : "";
  useEffect(() => { if (user && reviewIds) db.myLikes(reviewIds.split(",")).then(setLiked).catch(() => {}); }, [user, reviewIds]);
  const like = async (r) => {
    if (!user) return goLogin();
    const on = !liked.includes(r.id);
    setLiked((l) => (on ? [...l, r.id] : l.filter((x) => x !== r.id)));
    setList((l) => l.map((x) => (x.id === r.id ? { ...x, likes: Math.max(0, (x.likes || 0) + (on ? 1 : -1)) } : x)));
    try { await db.toggleLike(r.id); } catch (e) { setMsg(e.message); load(); }
  };
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [again, setAgain] = useState(null);
  const [visit, setVisit] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  const load = () => db.getReviews(spotId).then((l) => { setList(l); onChange && onChange(l); }).catch(() => setList([]));
  useEffect(() => { load(); }, [spotId]); // eslint-disable-line

  const mine = user && list ? list.find((r) => r.user_id === user.id) : null;
  useEffect(() => {
    if (mine) { setRating(mine.rating); setBody(mine.body || ""); setTags(mine.tags || []); setAgain(mine.would_return ?? null); setVisit(mine.visit_type || ""); }
  }, [mine && mine.id]); // eslint-disable-line

  const avg = list && list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
  const visitedN = list ? list.filter((r) => r.visited).length : 0;

  // Rule-based summary of what people say (no AI needed): top tags + "would go again".
  const summary = useMemo(() => {
    if (!list || list.length < 2) return "";
    const n = {};
    list.forEach((r) => (r.tags || []).forEach((t) => (n[t] = (n[t] || 0) + 1)));
    const top = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${tagLabel(t).toLowerCase()} (${c})`);
    const vt = {};
    list.forEach((r) => r.visit_type && (vt[r.visit_type] = (vt[r.visit_type] || 0) + 1));
    const bestFor = Object.entries(vt).sort((a, b) => b[1] - a[1])[0];
    const asked = list.filter((r) => typeof r.would_return === "boolean");
    const yes = asked.filter((r) => r.would_return).length;
    return [bestFor && bestFor[1] >= 2 && `Most often visited for: ${visitLabel(bestFor[0]).toLowerCase()} (${bestFor[1]}).`, top.length && `People mention: ${top.join(", ")}.`, asked.length >= 2 && `${Math.round((yes / asked.length) * 100)}% would go again.`]
      .filter(Boolean).join(" ");
  }, [list]);

  const toggleTag = (t) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : tags.length < 6 ? [...tags, t] : tags);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return goLogin();
    if (!rating) return setMsg("Tap the stars to rate first.");
    setBusy(true); setMsg("");
    try {
      await db.saveReview(spotId, rating, body, { tags, would_return: again === null ? undefined : again, visit_type: visit || undefined });
      await load(); setOpen(false); setMsg("Thanks! Your review is saved.");
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try { await db.deleteReview(id); setRating(0); setBody(""); setTags([]); setAgain(null); await load(); } catch (err) { setMsg(err.message); }
  };
  const report = async (id) => {
    if (!user) return goLogin();
    const reason = window.prompt("What is wrong with this review? (fake, rude, wrong place...)");
    if (!reason || reason.trim().length < 3) return;
    try { await db.report("review", id, reason); setMsg("Thanks. The Fyndo team will look at it."); } catch (err) { setMsg(err.message); }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div className="row between">
        <h2 style={{ margin: "18px 0 6px" }}>Fyndo reviews</h2>
        {list && list.length > 0 && (
          <div className="row small" style={{ gap: 6 }}><b style={{ fontSize: 18 }}>{avg.toFixed(1)}</b><Stars value={avg} /><span className="muted">({list.length})</span></div>
        )}
      </div>
      {list && list.length > 0 && visitedN > 0 && (
        <p className="small muted" style={{ margin: "0 0 6px" }}>{visitedN} of {list.length} reviews are from people who checked in here.</p>
      )}
      {summary && <div className="card pad small" style={{ background: "var(--cream)", marginBottom: 8 }}>{summary}</div>}

      {msg && <div className={"alert" + (/^(Thanks)/.test(msg) ? " ok" : "")}>{msg}</div>}

      {!open ? (
        <button className="btn ghost sm" onClick={() => (user ? setOpen(true) : goLogin())}>
          {mine ? "Edit your review" : "Write a review"}
        </button>
      ) : (
        <form className="card pad" onSubmit={submit}>
          <div className="field"><span>Your rating</span><Stars value={rating} onChange={setRating} size={30} /></div>
          <div className="field"><span>What stood out? (optional)</span>
            <div className="row" style={{ gap: 6 }}>
              {REVIEW_TAGS.map((t) => (
                <button type="button" key={t.id} className={"chip" + (tags.includes(t.id) ? " on" : "")} onClick={() => toggleTag(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="field"><span>Who did you go with?</span>
            <div className="row" style={{ gap: 6 }}>
              {VISIT_TYPES.map((v) => (
                <button type="button" key={v.id} className={"chip" + (visit === v.id ? " on" : "")} aria-pressed={visit === v.id} onClick={() => setVisit(visit === v.id ? "" : v.id)}>{v.label}</button>
              ))}
            </div>
          </div>
          <div className="field"><span>Would you go again?</span>
            <div className="seg">
              <button type="button" className={again === true ? "on" : ""} onClick={() => setAgain(again === true ? null : true)}><Ico n="thumbup" size={16} />Yes</button>
              <button type="button" className={again === false ? "on" : ""} onClick={() => setAgain(again === false ? null : false)}><Ico n="thumbdown" size={16} />No</button>
            </div>
          </div>
          <label className="field"><span>Your review (optional)</span>
            <textarea className="input" rows={3} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="What did you eat? Was it worth the price?" />
            <div className="small muted" style={{ textAlign: "right" }}>{body.length}/600</div>
          </label>
          <div className="row">
            <button className="btn sm" disabled={busy}>{busy ? "Saving..." : "Post review"}</button>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <p className="small muted" style={{ margin: "8px 0 0" }}>Check in with the table QR code to earn the “Visited” badge on your review.</p>
        </form>
      )}

      {list === null && <div className="skel line" style={{ width: "60%", marginTop: 12 }} />}
      {list && list.length === 0 && <p className="small muted" style={{ marginTop: 10 }}>No reviews yet. Be the first to share your visit.</p>}
      {list && list.map((r) => (
        <div key={r.id} className="review">
          <div className="row between">
            <span className="row" style={{ gap: 8 }}>
              {r.username
                ? <Link href={`/u?name=${r.username}`} className="row reviewer" style={{ gap: 8 }}><Avatar src={r.avatar_url} name={r.author} size={28} /><b>{r.author}</b><span className="small muted">@{r.username}</span></Link>
                : <><Avatar name={r.author} size={28} /><b>{r.author}</b></>}
              <Stars value={r.rating} size={14} />
              {r.visited && <span className="badge" title="This person checked in at this place">Visited</span>}
              {r.visit_type && <span className="tag">{visitLabel(r.visit_type)}</span>}
            </span>
            <span className="small muted">{ago(r.created_at)}</span>
          </div>
          {(r.tags || []).length > 0 && <div className="row small muted" style={{ gap: 6, marginTop: 2 }}>{r.tags.map((t) => <span key={t} className="tag">{tagLabel(t)}</span>)}</div>}
          {r.body && <p style={{ margin: "4px 0 0" }}>{r.body}</p>}
          {r.would_return === true && <div className="small muted"><Ico n="thumbup" size={14} /> Would go again</div>}
          {r.would_return === false && <div className="small muted"><Ico n="thumbdown" size={14} /> Would not go again</div>}
          {r.owner_reply && (
            <div className="reply"><b className="small">Reply from the owner</b><div className="small">{r.owner_reply}</div></div>
          )}
          <div className="row" style={{ gap: 12, marginTop: 4 }}>
            <button className={"likebtn" + (liked.includes(r.id) ? " on" : "")} aria-pressed={liked.includes(r.id)} onClick={() => like(r)}
              aria-label={`${liked.includes(r.id) ? "Unlike" : "Like"} this review${r.likes ? `, ${r.likes} likes` : ""}`}>
              <Ico n="heart" size={15} />{r.likes > 0 ? r.likes : ""}
            </button>
            {user && r.user_id === user.id && spot && (
              <ShareSheet label="Share as story" className="linkbtn" title={`${spot.name} on Fyndo`} text={`My review of ${spot.name} on Fyndo`} url={`/spot?id=${spot.id}`}
                make={() => reviewCard({ spot, rating: r.rating, body: r.body, username: user.username })} fileName={`fyndo-${spot.id}.png`} />
            )}
            {user && (r.user_id === user.id || user.role === "admin") && (
              <button className="linkbtn" style={{ color: "var(--chili)" }} onClick={() => remove(r.id)}>Delete</button>
            )}
            {(!user || r.user_id !== user.id) && <button className="linkbtn" style={{ color: "var(--muted)" }} onClick={() => report(r.id)}>Report</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Private message to the owner (not shown publicly).
export function FeedbackBox({ spotId, user }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const send = async (e) => {
    e.preventDefault();
    if (!user) return goLogin();
    try { await db.sendFeedback(spotId, text); setText(""); setOpen(false); setMsg("Sent privately to the owner. Thank you."); }
    catch (err) { setMsg(err.message); }
  };
  return (
    <div style={{ marginTop: 14 }}>
      {msg && <div className={"alert" + (msg.startsWith("Sent") ? " ok" : "")}>{msg}</div>}
      {!open ? (
        <button className="linkbtn" onClick={() => (user ? setOpen(true) : goLogin())}><Ico n="lock" size={14} /> Had a problem? Tell the owner privately</button>
      ) : (
        <form className="card pad" onSubmit={send}>
          <p className="small muted" style={{ marginTop: 0 }}>Only the owner and the Fyndo team can read this. It is not posted publicly.</p>
          <textarea className="input" rows={3} minLength={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="What went wrong, and how could they fix it?" />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm" disabled={text.trim().length < 3}>Send</button>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
