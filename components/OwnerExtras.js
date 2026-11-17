"use client";
import { Ico } from "./Icon";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { db } from "@/lib/data";
import { REVIEW_TAGS, FEATURES } from "@/lib/features";
import Stars from "@/components/Stars";
import { lkr, todayIso } from "@/lib/utils";
import { DAY_NAMES, dealSchedule } from "@/lib/deals";
import { DealBanner } from "@/components/TodayDeals";

// ---------- Rewards & QR tab ----------
export function RewardsTab({ spot, onSaved }) {
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [stats, setStats] = useState(null);
  const [goal, setGoal] = useState(spot.stamp_goal || 6);
  const [reward, setReward] = useState(spot.stamp_reward || "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setGoal(spot.stamp_goal || 6); setReward(spot.stamp_reward || ""); setErr("");
    db.checkinCode(spot.id).then(setCode).catch((e) => setErr(e.message));
    db.checkinStats(spot.id).then(setStats);
  }, [spot.id]); // eslint-disable-line

  const url = code ? `${window.location.origin}/checkin/?id=${encodeURIComponent(spot.id)}&code=${code}` : "";
  useEffect(() => { if (url) QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr("")); }, [url]);

  const rotate = async () => {
    if (!window.confirm("Make a NEW QR code? Posters you already printed will stop working.")) return;
    try { setCode(await db.checkinCode(spot.id, true)); setMsg("New code made. Print the new poster."); } catch (e) { setErr(e.message); }
  };
  const save = async () => {
    const patch = { stamp_goal: Math.max(2, Math.min(20, Number(goal) || 6)), stamp_reward: reward.trim().slice(0, 80) };
    try { await db.updateSpot(spot.id, patch); onSaved(patch); setMsg("Saved"); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="two" style={{ gap: 18 }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Table QR poster</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Customers scan this at the table. They get points and a stamp, and their review gets a “Visited” badge. It is free.</p>
        {err && <div className="alert">{err}</div>}
        <div className="card pad qrbox poster">
          <h2 style={{ margin: "0 0 4px" }}>{spot.name}</h2>
          <div style={{ fontWeight: 600 }}>Scan to earn Fyndo points</div>
          {qr ? <img src={qr} alt="Check-in QR code" style={{ margin: "10px 0" }} /> : <div className="loading">Making QR...</div>}
          <div className="small">{spot.stamp_reward ? `Collect ${spot.stamp_goal || 6} stamps: ${spot.stamp_reward}` : "Collect stamps and rewards"}</div>
          <div className="small muted">fyndo · Find the real spots</div>
        </div>
        <div className="row noprint" style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={() => window.print()} disabled={!qr}><Ico n="print" size={16} />Print poster</button>
          <button className="btn sm ghost" onClick={() => navigator.clipboard && navigator.clipboard.writeText(url).then(() => setMsg("Link copied."))}>Copy link</button>
          <button className="btn sm danger" onClick={rotate}>New code</button>
        </div>
        <p className="small muted noprint">Tip: keep the poster at the table or the till. Anyone with the link can check in, so make a new code if it leaks online.</p>
      </div>

      <div className="noprint">
        <h2 style={{ marginTop: 0 }}>Stamp card</h2>
        <div className="card pad">
          <label className="field"><span>Visits needed for a reward</span>
            <input className="input" type="number" min="2" max="20" value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
          <label className="field"><span>Reward (what the customer gets)</span>
            <input className="input" value={reward} maxLength={80} onChange={(e) => setReward(e.target.value)} placeholder="Free coffee, 10% off, free dessert..." /></label>
          <button className="btn sm" onClick={save}>Save</button> <span className="small">{msg}</span>
          <p className="small muted" style={{ marginBottom: 0 }}>Staff check the customer's stamp card on their phone (Fyndo, then Rewards) before giving the reward.</p>
        </div>

        <h2>Visits from Fyndo</h2>
        {stats ? (
          <div className="stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="stat"><b>{stats.total}</b><span className="small">Check-ins</span></div>
            <div className="stat"><b>{stats.last30}</b><span className="small">Last 30 days</span></div>
            <div className="stat"><b>{stats.visitors}</b><span className="small">Different people</span></div>
            <div className="stat"><b>{stats.repeat}</b><span className="small">Came back</span></div>
          </div>
        ) : <p className="small muted">Run the latest SQL (schema_v3.sql) to see visit numbers.</p>}
        {stats && stats.avg_spent ? <p className="small muted">People who noted their spending: about {lkr(stats.avg_spent)} per visit.</p> : null}
      </div>
    </div>
  );
}

// ---------- Reviews, replies, private feedback, simple coach ----------
const tagLabel = (id) => (REVIEW_TAGS.find((t) => t.id === id) || { label: id }).label;
const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

export function ReviewsTab({ spot }) {
  const [reviews, setReviews] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState(null);
  const [err, setErr] = useState("");

  const load = () => {
    db.getReviews(spot.id).then(setReviews);
    db.spotFeedback(spot.id).then(setFeedback);
    db.checkinStats(spot.id).then(setStats);
    db.spotStats(spot.id).then(setBooks).catch(() => {});
  };
  useEffect(() => { load(); }, [spot.id]); // eslint-disable-line

  const tips = useMemo(() => {
    if (!reviews) return [];
    const t = [];
    const n = reviews.length;
    const avg = n ? reviews.reduce((a, r) => a + r.rating, 0) / n : 0;
    if (n >= 3 && avg < 4) t.push(`Your average rating is ${avg.toFixed(1)}. Read the lowest-star reviews first and reply politely. Fixing one repeated problem helps the most.`);
    const tagN = {};
    reviews.forEach((r) => (r.tags || []).forEach((x) => (tagN[x] = (tagN[x] || 0) + 1)));
    const top = Object.entries(tagN).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) t.push(`People love your “${tagLabel(top[0]).toLowerCase()}” (${top[1]} mentions). Say it on your page and in your videos.`);
    if (n >= 5 && (tagN.value || 0) / n < 0.2 && avg < 4.3) t.push("Few people say you are “worth the price”. Compare your prices with similar places nearby and look at your most expensive dishes.");
    const asked = reviews.filter((r) => typeof r.would_return === "boolean");
    if (asked.length >= 4) {
      const pct = Math.round((asked.filter((r) => r.would_return).length / asked.length) * 100);
      if (pct < 70) t.push(`Only ${pct}% say they would go again. Check your recent low reviews and private messages for the reason.`);
    }
    const open = reviews.filter((r) => !r.owner_reply).length;
    if (open >= 2) t.push(`${open} reviews have no reply yet. A short, kind reply shows future customers you care.`);
    if (feedback.length) t.push(`You have ${feedback.length} private message${feedback.length > 1 ? "s" : ""} from customers below. These are chances to fix problems before they become public reviews.`);
    if (stats && stats.visitors >= 10 && stats.repeat / stats.visitors < 0.25) t.push(`Only ${Math.round((stats.repeat / stats.visitors) * 100)}% of Fyndo visitors came back. A stamp card reward (Rewards & QR tab) gives people a reason to return.`);
    if (!spot.stamp_reward) t.push("You have not set a stamp card reward yet. Add one in the Rewards & QR tab to bring people back.");
    if (books && books.bookings >= 10 && books.noShows / books.bookings > 0.15) t.push("Many bookings are no-shows. Message each guest on WhatsApp the day before to confirm.");
    if (!spot.video_url) t.push("Add a video link. A short video shows how your place really looks, so people decide faster.");
    if (spot.menu_updated_at && daysSince(spot.menu_updated_at) > 60) t.push(`Your prices were last checked ${daysSince(spot.menu_updated_at)} days ago. Update them so customers trust your menu.`);
    return t;
  }, [reviews, feedback, stats, books, spot]);

  const reply = async (id, text) => { try { await db.replyReview(id, text); load(); } catch (e) { setErr(e.message); } };

  return (
    <>
      {err && <div className="alert">{err}</div>}
      <h2 style={{ marginTop: 0 }}>Your weekly tips</h2>
      <div className="card pad">
        {tips.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{tips.map((x, i) => <li key={i} style={{ margin: "6px 0" }}>{x}</li>)}</ul>
          : <span className="muted">Nothing to fix right now. Keep collecting reviews and check-ins and tips will appear here.</span>}
        <p className="small muted" style={{ margin: "8px 0 0" }}>Worked out from your reviews, check-ins and bookings.</p>
      </div>

      <h2>Private messages ({feedback.length})</h2>
      {feedback.length === 0 ? <p className="small muted">No private messages. Customers can send feedback only you can read.</p> : (
        <div className="stack">{feedback.map((f) => (
          <div key={f.id} className="card pad"><div className="small muted">{new Date(f.created_at).toLocaleDateString()}</div>{f.body}</div>
        ))}</div>
      )}

      <h2>Reviews ({reviews ? reviews.length : "..."})</h2>
      {reviews && reviews.length === 0 && <p className="small muted">No reviews yet.</p>}
      <div className="stack">
        {(reviews || []).map((r) => <ReviewRow key={r.id} r={r} onReply={reply} />)}
      </div>
      <p className="small muted">You can reply to reviews but not delete them. If a review breaks the rules, use the Report button on your public page.</p>
    </>
  );
}

function ReviewRow({ r, onReply }) {
  const [text, setText] = useState(r.owner_reply || "");
  const [edit, setEdit] = useState(false);
  return (
    <div className="card pad">
      <div className="row between">
        <span className="row" style={{ gap: 8 }}><b>{r.author}</b><Stars value={r.rating} size={14} />{r.visited && <span className="badge">Visited</span>}</span>
        <span className="small muted">{new Date(r.created_at).toLocaleDateString()}</span>
      </div>
      {(r.tags || []).length > 0 && <div className="small muted">{r.tags.map(tagLabel).join(" · ")}</div>}
      {r.body && <p style={{ margin: "4px 0" }}>{r.body}</p>}
      {r.owner_reply && !edit && <div className="reply"><b className="small">Your reply</b><div className="small">{r.owner_reply}</div></div>}
      {edit ? (
        <div style={{ marginTop: 6 }}>
          <textarea className="input" rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank you for visiting! ..." />
          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn sm" onClick={async () => { await onReply(r.id, text); setEdit(false); }}>Post reply</button>
            <button className="btn sm ghost" onClick={() => setEdit(false)}>Cancel</button>
          </div>
        </div>
      ) : <button className="linkbtn" onClick={() => setEdit(true)}>{r.owner_reply ? "Edit reply" : "Reply"}</button>}
    </div>
  );
}

// ---------- Facilities picker (used by owner page editor and admin form) ----------
export function FeaturePicker({ value = [], onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="field"><span>Facilities</span>
      <div className="row" style={{ gap: 6 }}>
        {FEATURES.map((f) => (
          <button type="button" key={f.id} className={"chip" + (value.includes(f.id) ? " on" : "")} onClick={() => toggle(f.id)}>{f.emoji} {f.label}</button>
        ))}
      </div>
    </div>
  );
}

// ---------- Deals tab: one deal per place, shown on Home under "Today's deals" on the days and hours it runs ----------
export function DealsTab({ spot, onSaved }) {
  const d0 = spot.deal || {};
  const [title, setTitle] = useState(d0.title || "");
  const [detail, setDetail] = useState(d0.detail || "");
  const [days, setDays] = useState(Array.isArray(d0.days) ? d0.days : []);
  const [timed, setTimed] = useState(Boolean(d0.from && d0.to));
  const [from, setFrom] = useState(d0.from || "17:00");
  const [to, setTo] = useState(d0.to || "19:00");
  const [until, setUntil] = useState(d0.until || "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = spot.deal || {};
    setTitle(d.title || ""); setDetail(d.detail || ""); setDays(Array.isArray(d.days) ? d.days : []);
    setTimed(Boolean(d.from && d.to)); setFrom(d.from || "17:00"); setTo(d.to || "19:00"); setUntil(d.until || ""); setMsg(""); setErr("");
  }, [spot.id]); // eslint-disable-line

  const toggleDay = (i) => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort());
  const deal = { title: title.trim().slice(0, 60), detail: detail.trim().slice(0, 160), days: days.length === 7 ? [] : days,
    ...(timed ? { from, to } : {}), ...(until ? { until } : {}) };
  const store = async (value, done) => {
    setBusy(true); setErr(""); setMsg("");
    try { await db.updateSpot(spot.id, { deal: value }); onSaved({ deal: value }); setMsg(done); }
    catch (e) { setErr(/deal/i.test(e.message) ? "Run supabase/schema_v9.sql in Supabase first, then try again." : e.message); }
    setBusy(false);
  };
  const save = (e) => {
    e.preventDefault();
    if (title.trim().length < 3) return setErr("Give the deal a short title, like \"2 for 1 mocktails\".");
    if (timed && from === to) return setErr("The start and end times are the same. Pick different times.");
    store(deal, "Saved. It shows on Home on the days and hours you picked.");
  };

  return (
    <div className="two" style={{ gap: 18 }}>
      <form onSubmit={save} noValidate>
        <h2 style={{ marginTop: 0 }}>Today&apos;s deal</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Your deal appears on the Fyndo home page under &quot;Today&apos;s deals&quot; while it runs, and on your place page. It is included in your owner plan.</p>
        {err && <div className="alert" role="alert">{err}</div>}
        {msg && <div className="alert ok" role="status">{msg}</div>}
        <label className="field"><span>Deal title</span>
          <input className="input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="2 for 1 mocktails" />
          <span className="fieldhint">{60 - title.length} characters left</span></label>
        <label className="field"><span>Details (optional)</span>
          <input className="input" value={detail} maxLength={160} onChange={(e) => setDetail(e.target.value)} placeholder="Order before 7 pm. Dine in only." /></label>
        <div className="field"><span>Days</span>
          <div className="chips" style={{ flexWrap: "wrap", overflow: "visible" }}>
            <button type="button" className={"chip" + (!days.length ? " on" : "")} aria-pressed={!days.length} onClick={() => setDays([])}>Every day</button>
            {DAY_NAMES.map((n, i) => <button type="button" key={n} className={"chip" + (days.includes(i) ? " on" : "")} aria-pressed={days.includes(i)} onClick={() => toggleDay(i)}>{n}</button>)}
          </div></div>
        <div className="field"><span>Hours</span>
          <div className="seg" role="radiogroup" aria-label="Hours">
            <button type="button" role="radio" aria-checked={!timed} className={!timed ? "on" : ""} onClick={() => setTimed(false)}>While we are open</button>
            <button type="button" role="radio" aria-checked={timed} className={timed ? "on" : ""} onClick={() => setTimed(true)}>Set hours</button>
          </div>
          {timed && <div className="grid2" style={{ marginTop: 10 }}>
            <label className="field" style={{ margin: 0 }}><span>From</span><input className="input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="field" style={{ margin: 0 }}><span>To</span><input className="input" type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>}</div>
        <label className="field"><span>Ends on (optional)</span>
          <input className="input" type="date" value={until} min={todayIso()} onChange={(e) => setUntil(e.target.value)} />
          <span className="fieldhint">Leave empty to keep it running until you remove it.</span></label>
        <div className="row">
          <button className="btn" disabled={busy}>{busy ? "Saving..." : "Save deal"}</button>
          {(spot.deal && spot.deal.title) && <button type="button" className="btn ghost" disabled={busy} onClick={() => store({}, "Deal removed.")}>Remove deal</button>}
        </div>
      </form>
      <div>
        <h2 style={{ marginTop: 0 }}>How it looks</h2>
        {deal.title.length >= 3 ? <>
          <DealBanner spot={{ ...spot, deal }} />
          <p className="small muted">{dealSchedule(deal)}.</p>
        </> : <p className="small muted">Type a title to see a preview.</p>}
        <p className="small muted">Keep it true and simple: one clear offer, the hours it runs, and anything people must do (like asking for the Fyndo deal).</p>
      </div>
    </div>
  );
}
