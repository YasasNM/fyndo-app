"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ico } from "./Icon";
import { db } from "@/lib/data";
import { todayIso } from "@/lib/utils";

// Admin, Tools: photos visitors sent, waiting for a yes or no.
export function AdminVisitorPhotos() {
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const load = () => db.pendingPhotos().then(setList).catch((e) => { setMsg(e.message); setList([]); });
  useEffect(() => { load(); }, []);
  const act = async (s, approve) => {
    setBusy(s.id); setMsg("");
    try { await (approve ? db.approvePhoto(s) : db.rejectPhoto(s)); setMsg(approve ? `Added to ${s.spot ? s.spot.name : "the place"}.` : "Photo rejected and deleted."); await load(); }
    catch (e) { setMsg(e.message); }
    setBusy("");
  };
  if (!list) return <div className="loading">Loading photos...</div>;
  return (
    <>
      <p className="small muted" style={{ marginTop: 0 }}>Approve only clear photos of the place, its food or drinks. Reject faces, screenshots and anything unrelated.</p>
      {msg && <div className={"alert" + (/^Added|rejected/.test(msg) ? " ok" : "")}>{msg}</div>}
      {list.length === 0 ? <div className="empty"><div className="big"><Ico n="check" size={30} /></div>No photos waiting.</div> : (
        <div className="reviewgrid">
          {list.map((s) => (
            <div key={s.id} className="card reviewcard">
              {s.url ? <img src={s.url} alt={`Photo sent for ${s.spot ? s.spot.name : "a place"}`} /> : <div className="reviewcard-missing small muted">Photo could not load</div>}
              <div className="pad">
                <b>{s.spot ? <Link className="linkbtn" href={`/spot?id=${s.spot.id}`}>{s.spot.name}</Link> : s.spot_id}</b>
                {s.caption && <div className="small">“{s.caption}”</div>}
                <div className="small muted">From {(s.person && (s.person.name || s.person.email)) || "a visitor"}, {new Date(s.created_at).toLocaleDateString("en-GB")}</div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn sm" onClick={() => act(s, true)} disabled={busy === s.id}><Ico n="check" size={16} />Approve</button>
                  <button className="btn sm danger" onClick={() => act(s, false)} disabled={busy === s.id}>Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Admin, Tools: menus and prices the weekly job read from places' own websites. Nothing changes until applied.
export function AdminSuggestions() {
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => db.getSuggestions().then(setList).catch((e) => { setMsg(e.message); setList([]); });
  useEffect(() => { load(); }, []);
  const apply = async (s) => {
    const d = s.data || {};
    const patch = { menu: (d.items || []).map((i) => ({ item: i.item, price: i.price })), menu_updated_at: todayIso() };
    if (Number(d.price_min) > 0 && Number(d.price_max) >= Number(d.price_min)) { patch.price_min = Number(d.price_min); patch.price_max = Number(d.price_max); }
    try { await db.applySuggestion(s, patch); setMsg(`Menu updated for ${s.spot ? s.spot.name : "the place"}.`); load(); } catch (e) { setMsg(e.message); }
  };
  const dismiss = async (s) => { try { await db.dismissSuggestion(s.id); load(); } catch (e) { setMsg(e.message); } };
  if (!list) return <div className="loading">Loading suggestions...</div>;
  return (
    <>
      <p className="small muted" style={{ marginTop: 0 }}>The weekly photo job reads menus from places' own websites. Check the prices against the page before applying; applying replaces the menu on Fyndo.</p>
      {msg && <div className={"alert" + (/^Menu updated/.test(msg) ? " ok" : "")}>{msg}</div>}
      {list.length === 0 ? <div className="empty"><div className="big"><Ico n="receipt" size={30} /></div>No suggestions waiting.</div> : (
        <div className="stack">
          {list.map((s) => {
            const items = (s.data && s.data.items) || [];
            return (
              <div key={s.id} className="card pad">
                <div className="row between">
                  <b>{s.spot ? s.spot.name : s.spot_id}</b>
                  {s.source_url && <a className="linkbtn" href={s.source_url} target="_blank" rel="noreferrer">Open their menu page</a>}
                </div>
                <table className="simple" style={{ marginTop: 8 }}>
                  <tbody>{items.slice(0, 8).map((i, k) => <tr key={k}><td>{i.item}</td><td style={{ textAlign: "right" }}>LKR {Number(i.price).toLocaleString("en-US")}</td></tr>)}</tbody>
                </table>
                {items.length > 8 && <div className="small muted">and {items.length - 8} more</div>}
                {s.data && s.data.price_min ? <div className="small" style={{ marginTop: 6 }}>Suggested per person: LKR {s.data.price_min} to {s.data.price_max}</div> : null}
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn sm" onClick={() => apply(s)}>Apply menu and prices</button>
                  <button className="btn sm ghost" onClick={() => dismiss(s)}>Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
