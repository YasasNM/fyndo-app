"use client";
import { Ico } from "@/components/Icon";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser } from "@/lib/hooks";
import { stampsFor } from "@/lib/rewards";

export default function CheckinWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Checkin /></Suspense>;
}

function Checkin() {
  const p = useSearchParams();
  const id = p.get("id"), code = p.get("code");
  const user = useUser();
  const [spot, setSpot] = useState(undefined);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [row, setRow] = useState(null);
  const [note, setNote] = useState("");
  const [spent, setSpent] = useState("");
  const [saved, setSaved] = useState(false);
  const ran = useRef(false);

  useEffect(() => { db.getSpot(id).then(setSpot).catch(() => setSpot(null)); }, [id]);

  useEffect(() => {
    if (user === undefined || ran.current || !id || !code) return;
    if (user === null) { window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search); return; }
    ran.current = true;
    db.checkIn(id, code)
      .then(async (r) => {
        setRes(r);
        const list = await db.myCheckins();
        const today = list.find((c) => c.spot_id === id);
        if (today) { setRow(today); setNote(today.note || ""); setSpent(today.spent ?? ""); }
      })
      .catch((e) => setErr(e.message));
  }, [user, id, code]);

  if (!id || !code) return <div className="empty"><div className="big"><Ico n="qr" size={30} /></div>Scan the QR code on the table to check in.</div>;
  if (spot === undefined || user === undefined) return <div className="loading">Loading...</div>;
  if (!spot) return <div className="empty"><div className="big"><Ico n="pin" size={30} /></div>This place was not found.</div>;

  const st = res ? stampsFor(res.visits, spot.stamp_goal || 6) : null;
  const saveDiary = async () => {
    try { await db.updateCheckin(row.id, note, spent); setSaved(true); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="narrow center">
      <h1 style={{ marginTop: 30 }}>{spot.name}</h1>
      {!res && !err && <div className="loading">Checking you in...</div>}
      {err && <div className="alert">{err}</div>}
      {res && (
        <>
          <div className="success"><Ico n="check" size={36} strokeWidth={2.6} /></div>
          <h2 style={{ marginTop: 6 }}>{res.already ? "You already checked in today" : `+${res.points} points`}</h2>
          <p className="muted" style={{ marginTop: 0 }}>Visit number {res.visits} at {spot.name}.</p>
          <div className="card pad" style={{ textAlign: "left" }}>
            <b>Stamp card</b>
            <div className="stamps">{Array.from({ length: st.goal }).map((_, i) => {
              const full = st.done === 0 && st.rewards > 0 ? true : i < st.done;
              return <span key={i} className={full ? "on" : ""} />;
            })}</div>
            <p className="small muted" style={{ margin: 0 }}>
              {st.done === 0 && st.rewards > 0
                ? <>Card complete{spot.stamp_reward ? <>: <b>{spot.stamp_reward}</b>. Show this screen to the staff.</> : "!"}</>
                : <>{st.left} more visit{st.left > 1 ? "s" : ""} to complete your card{spot.stamp_reward ? <> and get <b>{spot.stamp_reward}</b></> : ""}.</>}
            </p>
          </div>

          {row && (
            <div className="card pad" style={{ textAlign: "left", marginTop: 12 }}>
              <b>Add to your food diary (optional)</b>
              <label className="field" style={{ marginTop: 8 }}><span>What did you order?</span>
                <input className="input" maxLength={300} value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} placeholder="Chicken kottu, iced coffee..." /></label>
              <label className="field"><span>About how much did you spend? (LKR)</span>
                <input className="input" type="number" min="0" value={spent} onChange={(e) => { setSpent(e.target.value); setSaved(false); }} /></label>
              <button className="btn sm" onClick={saveDiary}>{saved ? "Saved" : "Save"}</button>
            </div>
          )}
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <Link className="btn" href={`/spot?id=${spot.id}`}>Write a verified review</Link>
            <Link className="btn ghost" href="/rewards">My rewards</Link>
          </div>
        </>
      )}
    </div>
  );
}
