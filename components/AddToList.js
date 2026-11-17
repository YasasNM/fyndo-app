"use client";
import { useState } from "react";
import { Ico } from "./Icon";
import { db } from "@/lib/data";
import { goLogin } from "@/lib/hooks";

// "Add to a list" on a place page: tick your lists, or start a new one with this place in it.
export default function AddToList({ spot, user }) {
  const [lists, setLists] = useState(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const toggleOpen = async () => {
    if (!user) return goLogin();
    if (!open) { try { setLists(await db.myLists()); } catch { setLists([]); } }
    setOpen(!open); setMsg("");
  };
  const toggle = async (l) => {
    const has = l.spot_ids.includes(spot.id);
    const spot_ids = has ? l.spot_ids.filter((x) => x !== spot.id) : [...l.spot_ids, spot.id];
    try { await db.saveList({ ...l, spot_ids }); setLists((ls) => ls.map((x) => (x.id === l.id ? { ...x, spot_ids } : x))); setMsg(has ? `Removed from ${l.title}.` : `Added to ${l.title}.`); }
    catch (e) { setMsg(e.message); }
  };
  const create = async (e) => {
    e.preventDefault();
    try {
      const id = await db.saveList({ title, note: "", spot_ids: [spot.id], is_public: true });
      setLists((ls) => [{ id, title, spot_ids: [spot.id], is_public: true, note: "" }, ...(ls || [])]); setTitle(""); setMsg(`Added to ${title}.`);
    } catch (x) { setMsg(x.message); }
  };
  return (
    <div className="addtolist">
      <button className="linkbtn" onClick={toggleOpen} aria-expanded={open}><Ico n="list" size={15} /> Add to a list</button>
      {open && (
        <div className="card pad" style={{ marginTop: 8 }}>
          {lists && lists.length > 0 && (
            <div className="stack" style={{ marginBottom: 10 }}>
              {lists.map((l) => (
                <label key={l.id} className="row small" style={{ gap: 8 }}>
                  <input type="checkbox" checked={l.spot_ids.includes(spot.id)} onChange={() => toggle(l)} />{l.title} <span className="muted">({l.spot_ids.length})</span>
                </label>
              ))}
            </div>
          )}
          <form onSubmit={create} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="New list, e.g. Best kottu in Colombo 4" aria-label="New list name" />
            <button className="btn sm" disabled={title.trim().length < 2}>Create</button>
          </form>
          {msg && <div className="small" role="status" style={{ marginTop: 6 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
