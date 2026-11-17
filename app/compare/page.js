"use client";
import { Ico } from "@/components/Icon";
import { Suspense, useMemo, useState } from "react";
import { decide } from "@/lib/api";
import { compactSpot } from "@/lib/planner";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSpots, useRatings } from "@/lib/hooks";
import { Thumb } from "@/components/SpotCard";
import { featureOf } from "@/lib/features";
import { avgPrice, isOpenAt, niceTime, priceLabel } from "@/lib/utils";

export default function CompareWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Compare /></Suspense>;
}

function Compare() {
  const ids = (useSearchParams().get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const { spots } = useSpots();
  const ratings = useRatings();
  const picked = useMemo(() => (spots ? ids.map((i) => spots.find((s) => s.id === i)).filter(Boolean) : []), [spots, ids.join(",")]); // eslint-disable-line
  if (!spots) return <div className="loading">Loading...</div>;
  if (picked.length < 2) return <div className="empty"><div className="big"><Ico n="scale" size={30} /></div>Pick 2 or 3 places on the home page to compare.<br /><Link href="/" className="linkbtn">Go home</Link></div>;

  const now = new Date();
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const cheapest = Math.min(...picked.map(avgPrice));
  const best = Math.max(...picked.map((s) => (ratings[s.id] ? ratings[s.id].avg : 0)));
  const rows = [
    ["Price", (s) => <span style={avgPrice(s) === cheapest ? { color: "var(--green)", fontWeight: 700 } : {}}>{priceLabel(s)}{avgPrice(s) === cheapest ? " (lowest)" : ""}</span>],
    ["Fyndo rating", (s) => { const r = ratings[s.id]; return r ? <span style={r.avg === best ? { color: "var(--green)", fontWeight: 700 } : {}}>{r.avg.toFixed(1)} of 5 ({r.count} review{r.count > 1 ? "s" : ""}){r.visited ? `, ${r.visited} visited` : ""}</span> : <span className="muted">No reviews yet</span>; }],
    ["Open now", (s) => (isOpenAt(s, t) ? <span className="open-now">Yes</span> : <span className="closed-now">Closed</span>)],
    ["Hours", (s) => `${niceTime(s.open_time)} to ${niceTime(s.close_time)}`],
    ["Area", (s) => s.area],
    ["Type", (s) => s.category],
    ["Vibe", (s) => (s.moods || []).slice(0, 4).join(", ") || "-"],
    ["Facilities", (s) => (s.features || []).map((f) => (featureOf(f) || {}).label).filter(Boolean).join(", ") || "-"],
    ["Booking", (s) => (s.booking_enabled ? (s.booking_mode === "instant" ? "Instant" : "Request") : "Call / WhatsApp")],
    ["Verified", (s) => (s.verified ? "Yes" : "Not yet")],
  ];

  return (
    <>
      <h1>Compare</h1>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="simple compare">
          <thead>
            <tr><th></th>{picked.map((s) => (
              <th key={s.id}><Link href={`/spot?id=${s.id}`}><Thumb spot={s} className="mini" /><div style={{ marginTop: 6 }}>{s.name}</div></Link></th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}><td className="muted small" style={{ whiteSpace: "nowrap" }}>{label}</td>{picked.map((s) => <td key={s.id}>{fn(s)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <HelpChoose picked={picked} ratings={ratings} now={t} />
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn ghost" href="/">Back to places</Link>
      </div>
    </>
  );
}

// "Help me choose": a free AI recommends one of these places, using only the details in the table above.
function HelpChoose({ picked, ratings, now }) {
  const [need, setNeed] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ask = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await decide({ need, now, places: picked.map((s) => compactSpot(s, ratings, null, now)) })); }
    catch (x) { setErr(x.status === 429 ? x.message : "AI is busy right now. The table above has everything to compare."); }
    setBusy(false);
  };
  const byId = Object.fromEntries(picked.map((s) => [s.id, s]));
  const pick = res && byId[res.pick];
  return (
    <section className="card pad helpchoose" aria-labelledby="help-h">
      <h2 id="help-h" style={{ marginTop: 0 }}>Help me choose</h2>
      <form onSubmit={ask}>
        <label className="field" style={{ marginBottom: 10 }}><span>What matters most to you? (optional)</span>
          <input className="input" value={need} maxLength={200} onChange={(e) => setNeed(e.target.value)} placeholder="e.g. open now, cheap, good for a quiet date" /></label>
        <button className="btn sm" disabled={busy}><Ico n="star" size={16} />{busy ? "Thinking..." : "Help me choose"}</button>
      </form>
      {err && <div className="alert">{err}</div>}
      {pick && (
        <div className="helpchoose-out" aria-live="polite">
          <p style={{ margin: "14px 0 6px" }}><b>Fyndo's AI suggests <Link className="linkbtn" href={`/spot?id=${pick.id}`}>{pick.name}</Link></b></p>
          <p className="small" style={{ margin: "0 0 10px" }}>{res.why}</p>
          <ul className="helpchoose-notes">
            {res.notes.filter((n) => byId[n.id] && (n.good || n.watch)).map((n) => (
              <li key={n.id} className="small"><b>{byId[n.id].name}:</b> {n.good}{n.good && n.watch ? ". " : ""}{n.watch && <span className="muted">Check: {n.watch}</span>}</li>
            ))}
          </ul>
          <p className="small muted" style={{ margin: 0 }}>A suggestion from the details above; the choice is yours.</p>
        </div>
      )}
    </section>
  );
}
