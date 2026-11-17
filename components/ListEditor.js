"use client";
import { useMemo, useState } from "react";
import { Ico } from "./Icon";
import { db } from "@/lib/data";

// Create or edit one of your own lists: name, note, who can see it, and the places in order.
export default function ListEditor({ list, spots, onDone }) {
  const [l, setL] = useState({ ...list });
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t.length < 2 ? [] : spots.filter((s) => (s.name + " " + s.area).toLowerCase().includes(t) && !l.spot_ids.includes(s.id)).slice(0, 8);
  }, [q, spots, l.spot_ids]);
  const byId = (id) => spots.find((s) => s.id === id);
  const move = (i, d) => { const a = [...l.spot_ids]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setL({ ...l, spot_ids: a }); };
  const save = async () => { setErr(""); try { await db.saveList(l); onDone(); } catch (e) { setErr(e.message); } };
  return (
    <div className="narrow">
      <button className="linkbtn" style={{ marginTop: 16 }} onClick={onDone}>Back</button>
      <h1>{list.id ? "Edit list" : "New list"}</h1>
      <div className="card pad">
        <label className="field"><span>Name</span><input className="input" value={l.title} maxLength={80} onChange={(e) => setL({ ...l, title: e.target.value })} placeholder="Best kottu in Colombo 4" /></label>
        <label className="field"><span>About this list (optional)</span><textarea className="input" rows={2} maxLength={300} value={l.note} onChange={(e) => setL({ ...l, note: e.target.value })} /></label>
        <label className="row small" style={{ marginBottom: 12 }}><input type="checkbox" checked={l.is_public} onChange={(e) => setL({ ...l, is_public: e.target.checked })} /> Anyone can see this list</label>
        <div className="field"><span>Places ({l.spot_ids.length})</span>
          <ol className="listedit">
            {l.spot_ids.map((id, i) => byId(id) && (
              <li key={id}>
                <span className="listedit-name">{byId(id).name}<span className="small muted"> {byId(id).area}</span></span>
                <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                  <button type="button" className="iconbtn sm" onClick={() => move(i, -1)} aria-label={`Move ${byId(id).name} up`} disabled={i === 0}><Ico n="arrow" size={14} style={{ transform: "rotate(-90deg)" }} /></button>
                  <button type="button" className="iconbtn sm" onClick={() => move(i, 1)} aria-label={`Move ${byId(id).name} down`} disabled={i === l.spot_ids.length - 1}><Ico n="arrow" size={14} style={{ transform: "rotate(90deg)" }} /></button>
                  <button type="button" className="iconbtn sm" onClick={() => setL({ ...l, spot_ids: l.spot_ids.filter((x) => x !== id) })} aria-label={`Remove ${byId(id).name}`}><Ico n="close" size={14} /></button>
                </span>
              </li>
            ))}
          </ol>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place to add" aria-label="Search a place to add to the list" />
          {matches.length > 0 && <div className="row" style={{ gap: 6, marginTop: 6 }}>{matches.map((s) => (
            <button key={s.id} type="button" className="chip" onClick={() => { setL({ ...l, spot_ids: [...l.spot_ids, s.id] }); setQ(""); }}><Ico n="plus" size={14} />{s.name}</button>
          ))}</div>}
        </div>
        {err && <div className="alert">{err}</div>}
        <button className="btn" onClick={save}>Save list</button>
      </div>
    </div>
  );
}
