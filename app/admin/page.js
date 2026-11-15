"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { AREAS, CATEGORIES, MOODS } from "@/lib/seed";
import { slug, todayIso } from "@/lib/utils";
import { googleSearch } from "@/lib/api";
import OsmFinder from "@/components/OsmFinder";

const BLANK = {
  id: "", name: "", area: AREAS[0], category: CATEGORIES[0], price_min: 1000, price_max: 2000, moods: [], about: "",
  google_place_id: "", video_url: "", menu: [], open_time: "10:00", close_time: "22:00", lat: "", lng: "", phone: "", whatsapp: "",
  verified: false, hidden_gem: false, booking_enabled: false, booking_mode: "instant", tables_for_booking: 4,
  max_party: 6, slot_minutes: 30, booking_start: "18:00", booking_end: "21:30", cancel_hours: 2, color: "#FF8A1E",
};

const fromOsm = (r) => { const { address, ...rest } = r; return { ...BLANK, ...rest, area: r.area || BLANK.area, category: r.category || BLANK.category, phone: r.phone || "", about: r.about || "" }; };

export default function Admin() {
  const user = useUser();
  const [spots, setSpots] = useState(null);
  const [editing, setEditing] = useState(null); // spot object or BLANK
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [finder, setFinder] = useState(false);
  const load = () => db.getSpots().then(setSpots);
  useEffect(() => { if (user === null) goLogin(); if (user && user.role === "admin") load(); }, [user]);

  if (!user) return <div className="loading">Loading...</div>;
  if (user.role !== "admin") return <div className="empty"><div className="big">🔒</div>Admins only.</div>;
  if (!spots) return <div className="loading">Loading spots...</div>;

  if (editing) return <SpotForm initial={editing} isNew={!editing.id} onDone={(m) => { setEditing(null); setMsg(m || ""); load(); }} />;

  const shown = spots.filter((s) => (s.name + s.area + s.category).toLowerCase().includes(q.toLowerCase()));
  const del = async (s) => {
    if (!window.confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    try { await db.deleteSpot(s.id); setMsg("Deleted."); load(); } catch (e) { setMsg(e.message); }
  };
  const owner = async (s) => {
    const email = window.prompt(`Email of the owner for ${s.name} (they must sign up first):`);
    if (!email) return;
    try { await db.assignOwner(s.id, email); setMsg(`Owner set for ${s.name}.`); load(); } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      <div className="row between"><h1>Admin · Spots ({spots.length})</h1>
        <div className="row"><button className="btn ghost" onClick={() => setFinder(!finder)}>🗺️ Find places (free)</button>
          <button className="btn" onClick={() => setEditing({ ...BLANK })}>+ Add spot</button></div></div>
      {finder && <OsmFinder existing={spots.map((x) => x.name)} onPick={(r) => setEditing(fromOsm(r))} />}
      <p className="muted small" style={{ marginTop: 0 }}>Add places you have visited and checked. Mark them Verified once the menu and prices are confirmed.</p>
      {msg && <div className="alert ok">{msg}</div>}
      <input className="input" placeholder="Search spots..." value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: "8px 0 12px" }} />
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="simple">
          <thead><tr><th>Name</th><th>Area</th><th>Type</th><th>Status</th><th>Owner</th><th></th></tr></thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id}>
                <td><Link className="linkbtn" href={`/spot?id=${s.id}`}>{s.name}</Link></td>
                <td>{s.area}</td><td>{s.category}</td>
                <td>{s.verified ? <span className="badge">Verified</span> : <span className="badge grey">Unverified</span>}{" "}
                    {s.booking_enabled && <span className="badge book">Booking</span>}</td>
                <td className="small">{s.owner_id ? "✓ Claimed" : <button className="linkbtn" onClick={() => owner(s)}>Set owner</button>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="linkbtn" onClick={() => setEditing(s)}>Edit</button>{"  ·  "}
                  <button className="linkbtn" style={{ color: "var(--chili)" }} onClick={() => del(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SpotForm({ initial, isNew, onDone }) {
  const [f, setF] = useState({ ...initial, lat: initial.lat ?? "", lng: initial.lng ?? "" });
  const [err, setErr] = useState("");
  const [gq, setGq] = useState("");
  const [gRes, setGRes] = useState(null);
  const [gBusy, setGBusy] = useState(false);
  const findOnGoogle = async (e) => {
    e.preventDefault(); setErr(""); setGBusy(true);
    try { setGRes((await googleSearch(gq)).results); } catch (e2) { setErr(e2.message); setGRes(null); }
    setGBusy(false);
  };
  // Google's terms let us keep the place ID. The name is a starting point you check on your visit.
  const pickGoogle = (g) => { setF({ ...f, google_place_id: g.id, name: f.name || g.name }); setGRes(null); };
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value });
  const chk = (k) => (e) => setF({ ...f, [k]: e.target.checked });
  const toggleMood = (m) => setF({ ...f, moods: f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m] });
  const menuText = (f.menu || []).map((m) => `${m.item} | ${m.price}`).join("\n");
  const setMenuText = (t) => setF({ ...f, menu: t.split("\n").map((l) => l.split("|")).filter((p) => p[0].trim())
    .map((p) => ({ item: p[0].trim(), price: Number((p[1] || "0").replace(/[^0-9]/g, "")) })) });

  const save = async () => {
    setErr("");
    if (!f.name.trim()) return setErr("Name is required.");
    const spot = { ...f, id: isNew ? slug(f.name) : f.id, lat: f.lat === "" ? null : Number(f.lat),
      lng: f.lng === "" ? null : Number(f.lng), google_place_id: f.google_place_id || null, menu_updated_at: todayIso() };
    delete spot.created_at;
    try {
      if (isNew) await db.createSpot(spot); else await db.updateSpot(spot.id, spot);
      onDone(isNew ? `Added ${spot.name}.` : `Saved ${spot.name}.`);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="narrow">
      <button className="linkbtn" style={{ marginTop: 16 }} onClick={() => onDone()}>← Back to list</button>
      <h1>{isNew ? "Add a spot" : `Edit ${initial.name}`}</h1>
      <div className="card pad">
        <OsmFinder existing={[]} onPick={(r) => setF({ ...f, name: r.name, lat: r.lat, lng: r.lng, phone: r.phone || f.phone,
          about: f.about || r.about || "", area: r.area || f.area, category: r.category || f.category,
          open_time: r.open_time || f.open_time, close_time: r.close_time || f.close_time })} />
        <details style={{ marginBottom: 12 }}><summary className="small muted" style={{ cursor: "pointer" }}>Optional: link Google Maps (needs a Google key and card)</summary>
        <div className="field" style={{ background: "var(--cream)", padding: 12, borderRadius: 12, marginTop: 8 }}>
          <span>🔎 Link to Google Maps (shows live rating, hours, photos and reviews)</span>
          {f.google_place_id ? (
            <div className="row small">
              <span className="badge">Linked</span><code style={{ fontSize: 11 }}>{f.google_place_id}</code>
              <button className="linkbtn" onClick={() => setF({ ...f, google_place_id: "" })}>Unlink</button>
            </div>
          ) : (
            <form onSubmit={findOnGoogle} className="row" style={{ flexWrap: "nowrap" }}>
              <input className="input" value={gq} onChange={(e) => setGq(e.target.value)} placeholder="Place name and area, e.g. Hotel de Pilawoos Colombo 3" />
              <button className="btn sm" disabled={gBusy || gq.trim().length < 2}>{gBusy ? "..." : "Find"}</button>
            </form>
          )}
          {gRes && (gRes.length ? gRes.map((g) => (
            <button key={g.id} className="opt" style={{ marginTop: 8, marginBottom: 0, padding: "9px 12px" }} onClick={() => pickGoogle(g)}>
              <span><b>{g.name}</b><br /><span className="small muted">{g.type ? g.type + " · " : ""}{g.address}</span></span>
            </button>
          )) : <div className="small muted" style={{ marginTop: 6 }}>No match on Google. Try another name.</div>)}
        </div></details>
        <label className="field"><span>Name</span><input className="input" value={f.name} onChange={set("name")} /></label>
        <div className="grid2">
          <label className="field"><span>Area</span><select className="input" value={f.area} onChange={set("area")}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="field"><span>Type</span><select className="input" value={f.category} onChange={set("category")}>{CATEGORIES.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="field"><span>Price from (LKR pp)</span><input className="input" type="number" value={f.price_min} onChange={set("price_min", true)} /></label>
          <label className="field"><span>Price to (LKR pp)</span><input className="input" type="number" value={f.price_max} onChange={set("price_max", true)} /></label>
          <label className="field"><span>Opens</span><input className="input" type="time" value={f.open_time} onChange={set("open_time")} /></label>
          <label className="field"><span>Closes</span><input className="input" type="time" value={f.close_time} onChange={set("close_time")} /></label>
          <label className="field"><span>Latitude</span><input className="input" value={f.lat} onChange={set("lat")} placeholder="6.9135" /></label>
          <label className="field"><span>Longitude</span><input className="input" value={f.lng} onChange={set("lng")} placeholder="79.8491" /></label>
          <label className="field"><span>Phone</span><input className="input" value={f.phone || ""} onChange={set("phone")} /></label>
          <label className="field"><span>WhatsApp (94771234567)</span><input className="input" value={f.whatsapp || ""} onChange={set("whatsapp")} /></label>
        </div>
        <p className="small muted" style={{ marginTop: -4 }}>Tip: "Find places (free)" fills the map position for you.</p>
        <label className="field"><span>About</span><textarea className="input" rows={3} value={f.about} onChange={set("about")} /></label>
        <label className="field"><span>Video link (TikTok / Instagram / YouTube)</span><input className="input" value={f.video_url || ""} onChange={set("video_url")} /></label>
        <div className="field"><span>Moods</span>
          <div className="row" style={{ gap: 6 }}>{MOODS.map((m) => <button key={m} className={"chip" + (f.moods.includes(m) ? " on" : "")} onClick={() => toggleMood(m)}>{m}</button>)}</div></div>
        <label className="field"><span>Menu (one per line: Item | Price)</span>
          <textarea className="input" rows={4} defaultValue={menuText} onBlur={(e) => setMenuText(e.target.value)} placeholder={"Chicken kottu | 850\nIced Milo | 400"} /></label>
        <div className="row" style={{ gap: 18, marginBottom: 12 }}>
          <label className="row small"><input type="checkbox" checked={!!f.verified} onChange={chk("verified")} /> Verified</label>
          <label className="row small"><input type="checkbox" checked={!!f.hidden_gem} onChange={chk("hidden_gem")} /> Hidden gem</label>
          <label className="row small"><input type="checkbox" checked={!!f.booking_enabled} onChange={chk("booking_enabled")} /> Booking on</label>
          <label className="row small">Card colour <input type="color" value={f.color || "#FF8A1E"} onChange={set("color")} /></label>
        </div>
        {err && <div className="alert">{err}</div>}
        <button className="btn" onClick={save}>{isNew ? "Add spot" : "Save changes"}</button>
      </div>
    </div>
  );
}
