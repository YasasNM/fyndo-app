"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ico } from "@/components/Icon";
import Avatar from "@/components/Avatar";
import SpotCard from "@/components/SpotCard";
import ShareSheet from "@/components/ShareSheet";
import { db } from "@/lib/data";
import { useUser, useSpots, useRatings, goLogin } from "@/lib/hooks";
import { listCard } from "@/lib/sharecard";

export default function ListWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><ListPage /></Suspense>;
}

function ListPage() {
  const id = useSearchParams().get("id");
  const user = useUser();
  const { spots } = useSpots();
  const ratings = useRatings();
  const [l, setL] = useState(undefined);
  const [msg, setMsg] = useState("");
  useEffect(() => { db.getList(id).then(setL).catch(() => setL(null)); }, [id]);
  if (l === undefined || !spots) return <div className="loading">Loading...</div>;
  if (!l) return <div className="empty"><div className="big"><Ico n="list" size={30} /></div><h1 className="empty-title">This list is private or was removed</h1><Link className="linkbtn" href="/feed">Find people and lists</Link></div>;
  const places = l.spot_ids.map((sid) => spots.find((s) => s.id === sid)).filter(Boolean);
  const mine = user && user.id === l.user_id;
  const report = async () => {
    if (!user) return goLogin();
    const why = window.prompt("What's wrong with this list?");
    if (!why) return;
    try { await db.report("list", l.id, why); setMsg("Thanks. The Fyndo team will check it."); } catch (e) { setMsg(e.message); }
  };
  return (
    <>
      <div className="narrow">
        <h1 style={{ marginBottom: 6 }}>{l.title}</h1>
        {l.owner && (
          <Link href={`/u?name=${l.owner.username}`} className="row small" style={{ gap: 8 }}>
            <Avatar src={l.owner.avatar_url} name={l.owner.name} size={28} /><span>A list by <b>@{l.owner.username}</b></span>
          </Link>
        )}
        {l.note && <p>{l.note}</p>}
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <ShareSheet label="Share list" title={l.title} text={`${l.title}: a list on Fyndo`} url={`/list?id=${l.id}`}
            make={() => listCard({ title: l.title, note: l.note, spots: places, username: l.owner && l.owner.username })} fileName="fyndo-list.png" />
          {mine && <Link className="btn sm ghost" href="/profile">Edit in your profile</Link>}
          {!mine && <button className="linkbtn" onClick={report}>Report</button>}
          {!l.is_public && <span className="small muted">Only you can see this list.</span>}
        </div>
        {msg && <div className={"alert" + (/^Thanks/.test(msg) ? " ok" : "")}>{msg}</div>}
      </div>
      {places.length === 0 ? <p className="small muted center">No places in this list yet.</p> : (
        <ol className="grid rankgrid" style={{ marginTop: 18 }}>
          {places.map((s, i) => <li key={s.id} className="rankitem"><span className="rankno" aria-hidden="true">{i + 1}</span><SpotCard spot={s} rating={ratings[s.id]} /></li>)}
        </ol>
      )}
    </>
  );
}
