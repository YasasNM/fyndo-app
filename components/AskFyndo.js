"use client";
import { Ico } from "./Icon";
import { useState } from "react";
import Link from "next/link";
import { ask } from "@/lib/api";
import { matchSpots, planFromAsk, planLink } from "@/lib/askMatch";
import { lkr, niceTime } from "@/lib/utils";
import SpotCard from "./SpotCard";

const EXAMPLES = ["Anniversary dinner under 8000 in Colombo 7", "Cheap kottu with friends tonight", "Sunset date, veg, around 5k"];

export default function AskFyndo({ spots }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const go = async (text) => {
    const query = (text ?? q).trim();
    if (query.length < 3 || !spots) return;
    setQ(query); setBusy(true);
    const f = await ask(query);
    if (f.mode === "plan") {
      const { opts, plan } = planFromAsk(spots, f);
      setRes({ f, opts, plan });
    } else {
      setRes({ f, list: matchSpots(spots, f) });
    }
    setBusy(false);
  };

  return (
    <div className="ask">
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className="ask-in">
        <span className="ask-ic"><Ico n="search" size={20} /></span>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={300}
               placeholder="A place, a dish, or a whole night out" aria-label="Ask Fyndo" />
        <button className="btn" disabled={busy || q.trim().length < 3}>{busy ? "Finding..." : "Find"}</button>
      </form>
      {!res && (
        <div className="chips" style={{ marginTop: 8 }}>
          {EXAMPLES.map((e) => <button key={e} className="chip" onClick={() => go(e)}>{e}</button>)}
        </div>
      )}
      {res && (
        <div className="card pad ask-out">
          <div className="row between">
            <b>{res.f.reply}</b>
            <button className="linkbtn" onClick={() => { setRes(null); setQ(""); }}>Clear</button>
          </div>
          {!res.f.ai && <div className="small muted">Quick match (AI is off right now).</div>}
          {res.plan && (
            <>
              <div className="small muted" style={{ margin: "4px 0 8px" }}>
                {res.plan.vibeLabel}, {res.opts.area || "anywhere in Colombo"}, budget {lkr(res.opts.budget)} for two
              </div>
              {res.plan.stops.map((s, i) => (
                <div key={i} className="small" style={{ padding: "5px 0", borderBottom: "1px dashed var(--line)" }}>
                  <b>{niceTime(s.time)}</b> {s.label}:{" "}
                  {s.spot ? <Link className="linkbtn" href={`/spot/?id=${s.spot.id}`}>{s.spot.name}</Link> : <span className="muted">no match</span>}
                </div>
              ))}
              <div className="row between" style={{ marginTop: 10 }}>
                <span className="small">About <b>{lkr(res.plan.total)}</b> for two</span>
                <Link className="btn sm" href={planLink(res.opts)}>Open full plan</Link>
              </div>
            </>
          )}
          {res.list && (res.list.length
            ? <div className="grid" style={{ marginTop: 10 }}>{res.list.map((s) => <SpotCard key={s.id} spot={s} />)}</div>
            : <div className="small muted" style={{ marginTop: 6 }}>No spots match that yet. Try a different area or budget.</div>)}
        </div>
      )}
    </div>
  );
}
