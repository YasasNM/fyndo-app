"use client";
import { Ico } from "@/components/Icon";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser } from "@/lib/hooks";
import { TIERS, badgesOf, pointsOf, stampsFor, streakWeeks, tierOf } from "@/lib/rewards";
import { lkr } from "@/lib/utils";
import ShareSheet from "@/components/ShareSheet";
import { badgeCard } from "@/lib/sharecard";

const BADGE_ICON = { first: "star", ten: "compass", street: "flame", cafe: "cup", gem: "gem", date: "heart", regular: "home", area: "pin" };

export default function Rewards() {
  const user = useUser();
  const [list, setList] = useState(null);
  const [reviews, setReviews] = useState(0);
  const [msg, setMsg] = useState("");

  const load = () => Promise.all([db.myCheckins(), db.myReviewCount()]).then(([c, r]) => { setList(c); setReviews(r); }).catch(() => setList([]));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const stats = useMemo(() => {
    if (!list) return null;
    const points = pointsOf(list, reviews);
    const perSpot = {};
    list.forEach((c) => { if (!c.spot) return; const o = perSpot[c.spot_id] || (perSpot[c.spot_id] = { spot: c.spot, visits: 0 }); o.visits++; });
    return { points, tier: tierOf(points), streak: streakWeeks(list), badges: badgesOf(list), cards: Object.values(perSpot).sort((a, b) => b.visits - a.visits),
      spent: list.reduce((a, c) => a + (c.spent || 0), 0) };
  }, [list, reviews]);

  if (user === undefined) return <div className="loading">Loading...</div>;
  if (!user) return (
    <div className="empty"><div className="big"><Ico n="ticket" size={30} /></div>Log in to collect points and stamps at your favourite places.<br /><br />
      <Link href="/login?next=/rewards" className="btn">Log in or sign up</Link></div>
  );
  if (!list || !stats) return <div className="loading">Loading your rewards...</div>;
  const { tier } = stats;

  return (
    <>
      <h1>Fyndo Rewards</h1>
      <div className="tier">
        <div className="row between">
          <div><div className="small" style={{ opacity: 0.8 }}>Your level</div>
            <h2 style={{ margin: 0, color: "#fff" }}>{tier.cur.label}</h2></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 30, fontWeight: 700 }}>{stats.points}</div><div className="small" style={{ opacity: 0.8 }}>points</div></div>
        </div>
        <div className="progress"><div style={{ width: `${tier.pct}%` }} /></div>
        <div className="small" style={{ opacity: 0.9 }}>
          {tier.next ? <>{tier.toNext} points to {tier.next.label}</> : "You are at the top level"}. {tier.cur.perk}
        </div>
      </div>

      <div className="stats" style={{ marginTop: 12 }}>
        <div className="stat"><b>{list.length}</b><span className="small">Check-ins</span></div>
        <div className="stat"><b>{stats.cards.length}</b><span className="small">Places</span></div>
        <div className="stat"><b>{stats.streak}</b><span className="small">Week streak</span></div>
        <div className="stat"><b>{reviews}</b><span className="small">Reviews</span></div>
      </div>
      <p className="small muted">How to earn: check in with the table QR code (+10 points), write a review (+5 points). Visit a new place each week to keep your streak.</p>

      <h2>Badges</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {stats.badges.map((b) => (
          <div key={b.id} className={"card pad center badge-card" + (b.got ? "" : " locked")}>
            <div className="medal"><Ico n={BADGE_ICON[b.id] || "star"} size={24} /></div><b className="small">{b.label}</b>
            <div className="small muted">{b.got ? "Earned" : b.hint}</div>
            {b.got && (
              <ShareSheet label="Share" className="linkbtn" title={`${b.label}: a Fyndo badge`} text={`I earned the ${b.label} badge on Fyndo`}
                url={user.username ? `/u?name=${user.username}` : "/rewards"} make={() => badgeCard({ badge: b, username: user.username, tier: tier.cur.label })} fileName={`fyndo-badge-${b.id}.png`} />
            )}
          </div>
        ))}
      </div>

      <h2>Stamp cards</h2>
      {stats.cards.length === 0 ? <div className="empty"><div className="big"><Ico n="bookmark" size={30} /></div>No stamps yet. Scan the QR code at a partner place.</div> : (
        <div className="grid">
          {stats.cards.map(({ spot, visits }) => {
            const st = stampsFor(visits, spot.stamp_goal || 6);
            return (
              <Link key={spot.id} href={`/spot?id=${spot.id}`} className="card pad">
                <b>{spot.name}</b>
                <div className="stamps">{Array.from({ length: st.goal }).map((_, i) => <span key={i} className={i < st.done ? "on" : ""} />)}</div>
                <div className="small muted">{spot.stamp_reward ? `${st.left} more for: ${spot.stamp_reward}` : `${visits} visit${visits > 1 ? "s" : ""}`}</div>
                {st.rewards > 0 && spot.stamp_reward && <div className="small" style={{ color: "var(--green)" }}>{st.rewards} reward{st.rewards > 1 ? "s" : ""} earned</div>}
              </Link>
            );
          })}
        </div>
      )}

      <h2>Levels</h2>
      <div className="card pad">
        {TIERS.map((t) => (
          <div key={t.id} className="kv"><span><b>{t.label}</b> <span className="small muted">· {t.perk}</span></span><span>{t.min}+ pts</span></div>
        ))}
        <p className="small muted" style={{ margin: "8px 0 0" }}>Points never come from likes or views. They need a real visit.</p>
      </div>

      <h2>My food diary {stats.spent > 0 && <span className="small muted">· {lkr(stats.spent)} noted</span>}</h2>
      {msg && <div className="alert">{msg}</div>}
      {list.length === 0 ? <p className="muted small">Your visits will show up here.</p> : (
        <div className="stack">{list.map((c) => <DiaryRow key={c.id} c={c} onError={setMsg} />)}</div>
      )}
    </>
  );
}

function DiaryRow({ c, onError }) {
  const [note, setNote] = useState(c.note || "");
  const [spent, setSpent] = useState(c.spent ?? "");
  const [saved, setSaved] = useState(true);
  const save = async () => { try { await db.updateCheckin(c.id, note, spent); setSaved(true); } catch (e) { onError(e.message); } };
  return (
    <div className="card pad">
      <div className="row between">
        <Link className="linkbtn" href={`/spot?id=${c.spot_id}`}>{c.spot ? c.spot.name : "Place"}</Link>
        <span className="small muted">{c.day}, +{c.points} points</span>
      </div>
      <div className="row" style={{ flexWrap: "nowrap", marginTop: 6 }}>
        <input className="input" value={note} maxLength={300} placeholder="What did you order?" onChange={(e) => { setNote(e.target.value); setSaved(false); }} />
        <input className="input" style={{ width: 110 }} type="number" min="0" value={spent} placeholder="LKR" onChange={(e) => { setSpent(e.target.value); setSaved(false); }} />
        <button className="btn sm ghost" onClick={save} disabled={saved}>{saved ? "Saved" : "Save"}</button>
      </div>
    </div>
  );
}
