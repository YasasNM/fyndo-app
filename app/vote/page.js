"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/data";
import { shareNow } from "@/lib/utils";

export default function VoteWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Vote /></Suspense>;
}

function voterId() {
  try {
    let v = localStorage.getItem("fyndo_voter");
    if (!v) { v = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("fyndo_voter", v); }
    return v;
  } catch { return "v" + Math.random().toString(36).slice(2) + "anon"; }
}

function Vote() {
  const id = useSearchParams().get("id");
  const [poll, setPoll] = useState(undefined);
  const [mine, setMine] = useState(null);
  const [err, setErr] = useState("");

  const load = () => db.getPoll(id).then((p) => setPoll(p || null)).catch(() => setPoll(null));
  useEffect(() => {
    if (!id) return;
    try { const m = localStorage.getItem("fyndo_vote_" + id); if (m !== null) setMine(Number(m)); } catch {}
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [id]); // eslint-disable-line

  if (!id) return <div className="empty"><div className="big">🗳️</div>No vote link. Ask your friend to share it again.</div>;
  if (poll === undefined) return <div className="loading">Loading vote...</div>;
  if (!poll) return <div className="empty"><div className="big">🗳️</div>This vote was not found.<br /><Link href="/" className="linkbtn">Go home</Link></div>;

  const total = poll.counts.reduce((a, b) => a + b, 0);
  const top = Math.max(...poll.counts);
  const vote = async (i) => {
    setErr("");
    try { await db.votePoll(id, voterId(), i); setMine(i); try { localStorage.setItem("fyndo_vote_" + id, String(i)); } catch {} load(); }
    catch (e) { setErr(e.message); }
  };
  const share = () => shareNow({ title: poll.title, text: `Where should we go? Vote here:`, url: window.location.href });

  return (
    <div className="narrow">
      <h1>🗳️ {poll.title}</h1>
      <p className="muted" style={{ marginTop: 0 }}>Tap your pick. You can change it. No account needed.</p>
      {err && <div className="alert">{err}</div>}
      <div className="stack">
        {poll.options.map((o, i) => {
          const n = poll.counts[i] || 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const leading = total > 0 && n === top;
          return (
            <button key={i} className={"opt votebar" + (mine === i ? " on" : "")} onClick={() => vote(i)} style={{ "--pct": pct + "%" }}>
              <span style={{ flex: 1, position: "relative" }}>
                <b>{o.name}</b>{leading && " 🏆"}
                <span className="small muted" style={{ display: "block" }}>{[o.area, o.price].filter(Boolean).join(" · ")}</span>
              </span>
              <span style={{ position: "relative", textAlign: "right" }}><b>{n}</b><span className="small muted"> · {pct}%</span>{mine === i && <div className="small">Your vote ✓</div>}</span>
            </button>
          );
        })}
      </div>
      <p className="small muted">{total} vote{total === 1 ? "" : "s"} so far. Results update by themselves.</p>
      <div className="row">
        <button className="btn" onClick={share}>Share with friends</button>
        {total > 0 && poll.options.filter((_, i) => poll.counts[i] === top).map((o) => (
          o.id ? <Link key={o.id} className="btn ghost" href={`/spot?id=${o.id}`}>See {o.name}</Link> : null
        )).slice(0, 2)}
      </div>
    </div>
  );
}
