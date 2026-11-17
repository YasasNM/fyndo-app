"use client";
import { Ico } from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, useSpots } from "@/lib/hooks";
import SpotCard from "@/components/SpotCard";
import { lkr, niceTime, shareWa } from "@/lib/utils";

export default function Saved() {
  const user = useUser();
  const { spots } = useSpots();
  const [tab, setTab] = useState("spots");
  const [ids, setIds] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => { if (user) { db.getSaves().then(setIds); db.getPlans().then(setPlans); } }, [user]);

  if (user === undefined) return <div className="loading">Loading...</div>;
  if (!user) return (
    <div className="empty"><div className="big"><Ico n="bookmark" size={30} /></div><h1 className="empty-title">Log in to save spots and date plans</h1>
      <Link href="/login?next=/saved" className="btn">Log in</Link></div>
  );

  const mine = (spots || []).filter((s) => ids.includes(s.id));
  const del = async (id) => { await db.deletePlan(id); setPlans(plans.filter((p) => p.id !== id)); };

  return (
    <>
      <h1>Saved</h1>
      <div className="tabs-in">
        <button className={tab === "spots" ? "on" : ""} onClick={() => setTab("spots")}>Spots ({mine.length})</button>
        <button className={tab === "plans" ? "on" : ""} onClick={() => setTab("plans")}>Date plans ({plans.length})</button>
      </div>
      {tab === "spots" && (mine.length ? <div className="grid">{mine.map((s) => <SpotCard key={s.id} spot={s} />)}</div>
        : <div className="empty"><div className="big"><Ico n="bookmark" size={30} /></div>No saved spots yet. Tap Save on any spot.</div>)}
      {tab === "plans" && (plans.length ? (
        <div className="stack">
          {plans.map((p) => (
            <div key={p.id} className="card pad">
              <div className="row between"><h3>{p.title}</h3><span className="small muted">{lkr(p.data.total)} for two</span></div>
              {p.data.stops.filter((s) => s.spot).map((s, i) => (
                <div key={i} className="small" style={{ marginTop: 4 }}>
                  {niceTime(s.time)} {s.label}: <Link className="linkbtn" href={`/spot?id=${s.spot.id}`}>{s.spot.name}</Link>
                </div>
              ))}
              <div className="row" style={{ marginTop: 10 }}>
                <a className="btn sm" target="_blank" rel="noreferrer"
                   href={shareWa(`Our Fyndo plan: ` + p.data.stops.filter((s) => s.spot).map((s) => `${niceTime(s.time)} ${s.spot.name}`).join(", "))}>Share</a>
                <button className="btn sm danger" onClick={() => del(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty"><div className="big"><Ico n="heart" size={30} /></div>No saved plans. <Link className="linkbtn" href="/plan">Plan a date</Link></div>)}
    </>
  );
}
