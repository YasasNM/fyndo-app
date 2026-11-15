"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { stampsFor } from "@/lib/rewards";

// On the spot page: the loyalty stamp card for this place.
export default function RewardsBox({ spot, user }) {
  const [visits, setVisits] = useState(null);
  useEffect(() => {
    if (!user) return setVisits(0);
    db.myCheckins().then((l) => setVisits(l.filter((c) => c.spot_id === spot.id).length)).catch(() => setVisits(0));
  }, [user, spot.id]);
  if (visits === null) return null;
  const st = stampsFor(visits, spot.stamp_goal || 6);
  return (
    <div className="card pad" style={{ marginTop: 14 }}>
      <div className="row between">
        <b>Fyndo Rewards</b>
        <Link className="linkbtn" href="/rewards">My rewards</Link>
      </div>
      <div className="stamps" aria-label={`${st.done} of ${st.goal} stamps`}>
        {Array.from({ length: st.goal }).map((_, i) => <span key={i} className={i < st.done ? "on" : ""} />)}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {spot.stamp_reward ? <>Collect {st.goal} stamps for: <b>{spot.stamp_reward}</b>. {st.left} to go.</> : <>Scan the QR code on the table to earn 10 points and a stamp.</>}
        {user ? "" : " Log in to start collecting."}
      </p>
      {st.rewards > 0 && spot.stamp_reward && <p className="small" style={{ margin: "6px 0 0", color: "var(--green)" }}>You have earned {st.rewards} reward{st.rewards > 1 ? "s" : ""}. Show this screen to the staff.</p>}
    </div>
  );
}
