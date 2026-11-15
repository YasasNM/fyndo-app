"use client";
import { useState } from "react";
import { osmSearch, osmNearby, AREA_CENTERS } from "@/lib/osm";

// Admin helper: find real places for free from OpenStreetMap and pick one to pre-fill the form.
// existing: names already in Fyndo (to flag duplicates). onPick(prefill).
export default function OsmFinder({ existing = [], onPick, defaultArea = "Colombo 3" }) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState(defaultArea);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const have = new Set(existing.map((n) => n.toLowerCase()));

  const run = async (fn) => {
    setErr(""); setBusy(true); setRows(null);
    try { setRows(await fn()); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="field" style={{ background: "var(--cream)", padding: 12, borderRadius: 12 }}>
      <span>Find real places (free, from OpenStreetMap)</span>
      <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); run(() => osmSearch(q)); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Place name, e.g. Pilawoos Colombo" />
        <button className="btn sm" disabled={busy || q.trim().length < 2}>{busy ? "..." : "Search"}</button>
      </form>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="small muted">or list places near</span>
        <select className="input" style={{ width: "auto" }} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area to scan">
          {Object.keys(AREA_CENTERS).map((a) => <option key={a}>{a}</option>)}
        </select>
        <button className="btn sm ghost" disabled={busy} onClick={() => run(() => osmNearby(area))}>Find nearby</button>
      </div>
      {err && <div className="alert">{err}</div>}
      {rows && !rows.length && <div className="small muted" style={{ marginTop: 6 }}>Nothing found. OpenStreetMap may not have it yet.</div>}
      {rows && rows.map((r, i) => (
        <button key={i} type="button" className="opt" style={{ marginTop: 8, marginBottom: 0, padding: "9px 12px" }}
          onClick={() => onPick(r)} disabled={have.has(r.name.toLowerCase())}>
          <span style={{ minWidth: 0 }}>
            <b>{r.name}</b> {have.has(r.name.toLowerCase()) && <span className="badge grey">Already added</span>}<br />
            <span className="small muted">{[r.category, r.area, r.address && r.address.split(",").slice(0, 3).join(",")].filter(Boolean).join(" · ")}</span>
          </span>
        </button>
      ))}
      <p className="small muted" style={{ margin: "8px 0 0" }}>
        Always check details before you publish. Map data © OpenStreetMap contributors.
      </p>
    </div>
  );
}
