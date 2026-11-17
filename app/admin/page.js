"use client";
import { Ico } from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { AREAS, CATEGORIES, MOODS } from "@/lib/seed";
import { slug, todayIso, parseMenu, menuToText } from "@/lib/utils";
import { FeaturePicker } from "@/components/OwnerExtras";
import { SetupCheck, GoogleLinker } from "@/components/AdminGoogle";
import AdminDiscover from "@/components/AdminDiscover";
import PhotoManager from "@/components/PhotoManager";
import AdminPhotos, { PhotoSuggest } from "@/components/AdminPhotos";
import AdminClaims from "@/components/AdminClaims";
import { AdminVisitorPhotos, AdminSuggestions } from "@/components/AdminReview";
import { LinksFields } from "@/components/OfficialLinks";
import { googleSearch } from "@/lib/api";

const BLANK = {
  id: "", name: "", area: AREAS[0], category: CATEGORIES[0], price_min: 1000, price_max: 2000, moods: [], about: "",
  google_place_id: "", video_url: "", menu: [], open_time: "10:00", close_time: "22:00", lat: "", lng: "", phone: "", whatsapp: "",
  features: [], stamp_goal: 6, stamp_reward: "", verified: false, hidden_gem: false, booking_enabled: false, booking_mode: "instant", tables_for_booking: 4,
  max_party: 6, slot_minutes: 30, booking_start: "18:00", booking_end: "21:30", cancel_hours: 2, color: "#FF8A1E",
};


function Collections({ spots }) {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");
  const load = () => db.getCollections().then(setList);
  useEffect(() => { load(); }, []);
  const blank = { id: "", title: "", blurb: "", emoji: "", spot_ids: [], published: true, sort: 0 };
  const save = async () => {
    if (!edit.title.trim()) return setErr("Add a title.");
    try { await db.saveCollection({ ...edit, id: edit.id || slug(edit.title) }); setEdit(null); setErr(""); load(); } catch (e) { setErr(e.message); }
  };
  const toggle = (id) => setEdit({ ...edit, spot_ids: edit.spot_ids.includes(id) ? edit.spot_ids.filter((x) => x !== id) : [...edit.spot_ids, id] });
  if (!list) return <div className="loading">Loading...</div>;
  if (edit) return (
    <div className="card pad narrow" style={{ margin: 0 }}>
      <div className="grid2">
        <label className="field"><span>Title</span><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Best kottu in Colombo" /></label>
        <label className="field"><span>Emoji</span><input className="input" value={edit.emoji} maxLength={4} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} /></label>
      </div>
      <label className="field"><span>Short note</span><input className="input" value={edit.blurb} onChange={(e) => setEdit({ ...edit, blurb: e.target.value })} /></label>
      <div className="field"><span>Places in this list</span>
        <div className="row" style={{ gap: 6 }}>{spots.map((s) => <button key={s.id} type="button" className={"chip" + (edit.spot_ids.includes(s.id) ? " on" : "")} onClick={() => toggle(s.id)}>{s.name}</button>)}</div></div>
      <label className="row small"><input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> Show on the home page</label>
      {err && <div className="alert">{err}</div>}
      <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={save}>Save list</button><button className="btn ghost" onClick={() => { setEdit(null); setErr(""); }}>Cancel</button></div>
    </div>
  );
  return (
    <>
      <div className="row between"><p className="small muted" style={{ margin: 0 }}>Curated lists show as rows on the home page. Run schema_v3.sql first.</p>
        <button className="btn sm" onClick={() => setEdit({ ...blank })}>+ New list</button></div>
      {err && <div className="alert">{err}</div>}
      <div className="stack" style={{ marginTop: 10 }}>
        {list.map((c) => (
          <div key={c.id} className="card pad row between">
            <span>{c.emoji} <b>{c.title}</b> <span className="small muted">· {c.spot_ids.length} places {c.published ? "" : "· hidden"}</span></span>
            <span><button className="linkbtn" onClick={() => setEdit(c)}>Edit</button>{"  ·  "}
              <button className="linkbtn" style={{ color: "var(--chili)" }} onClick={async () => { if (window.confirm("Delete this list?")) { await db.deleteCollection(c.id); load(); } }}>Delete</button></span>
          </div>
        ))}
        {list.length === 0 && <div className="empty">No lists yet.</div>}
      </div>
    </>
  );
}

function Reports({ spots }) {
  const [list, setList] = useState(null);
  const load = () => db.getReports().then(setList);
  useEffect(() => { load(); }, []);
  if (!list) return <div className="loading">Loading...</div>;
  const name = (id) => (spots.find((s) => s.id === id) || {}).name || id;
  const open = list.filter((r) => !r.resolved);
  return (
    <>
      <p className="small muted" style={{ marginTop: 0 }}>{open.length} open report{open.length === 1 ? "" : "s"}. To remove a bad review, open the spot page as admin and tap Delete on it.</p>
      <div className="stack">
        {list.map((r) => (
          <div key={r.id} className="card pad" style={{ opacity: r.resolved ? 0.55 : 1 }}>
            <div className="row between"><b>{r.kind === "review" ? "Review" : "Spot"} report</b><span className="small muted">{new Date(r.created_at).toLocaleDateString()}</span></div>
            <div className="small">“{r.reason}”</div>
            <div className="small muted">Target: {r.kind === "spot" ? name(r.target) : r.target}</div>
            {!r.resolved && <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={async () => { await db.resolveReport(r.id); load(); }}>Mark resolved</button>}
          </div>
        ))}
        {list.length === 0 && <div className="empty">No reports.</div>}
      </div>
    </>
  );
}

export default function Admin() {
  const user = useUser();
  const [spots, setSpots] = useState(null);
  const [editing, setEditing] = useState(null); // spot object or BLANK
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [tool, setTool] = useState("");
  const [tab, setTab] = useState("spots");
  const load = () => db.getSpots().then(setSpots);
  useEffect(() => { if (user === null) goLogin(); if (user && user.role === "admin") load(); }, [user]);

  if (!user) return <div className="loading">Loading...</div>;
  if (user.role !== "admin") return <div className="empty"><div className="big"><Ico n="lock" size={30} /></div>Admins only.</div>;
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

  const TABS = [["spots", "Spots"], ["tools", "Tools"], ["claims", "Owner claims"], ["collections", "Lists"], ["reports", "Reports"]];
  const tabs = (
    <div className="tabs-in" role="tablist" aria-label="Admin sections">{TABS.map(([k, l]) => (
      <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setTool(""); }}>{l}</button>))}</div>
  );

  // Tools: one simple list; each tool opens on its own, with a way back.
  const TOOLS = [
    ["setup", "pin", "Setup check", "Is Google, the database and AI working?"],
    ["photos", "star", "Find real photos", "Look up photos of places from open sources and their websites"],
    ["discover", "search", "Add places from Google", "Popular food spots in an area"],
    ["link", "link", "Link places to Google", "Match your places to Google Maps for live hours and ratings"],
    ["visitor", "plus", "Visitor photos", "Photos visitors sent, waiting for your yes or no"],
    ["menus", "receipt", "Menu suggestions", "Menus and prices the weekly job read from places' own websites"],
  ];
  if (tab === "tools") {
    const t = TOOLS.find((x) => x[0] === tool);
    return (
      <>
        <h1>Admin</h1>
        {tabs}
        {msg && <div className="alert ok">{msg}</div>}
        {!t ? (
          <nav className="menu" aria-label="Admin tools" style={{ marginTop: 0 }}>
            {TOOLS.map(([k, ic, title, sub]) => (
              <button key={k} type="button" className="menu-btn" onClick={() => { setMsg(""); setTool(k); }}>
                <Ico n={ic} size={20} /><span><b>{title}</b><span className="small muted">{sub}</span></span>
              </button>
            ))}
          </nav>
        ) : (
          <>
            <button className="linkbtn" onClick={() => setTool("")}>All tools</button>
            <h2 style={{ marginTop: 8 }}>{t[2]}</h2>
            {tool === "setup" && <SetupCheck spots={spots} />}
            {tool === "photos" && <AdminPhotos spots={spots} onDone={load} />}
            {tool === "discover" && <AdminDiscover spots={spots} onDone={load} />}
            {tool === "link" && <GoogleLinker spots={spots} onDone={(m) => { setMsg(m); setTool(""); load(); }} />}
            {tool === "visitor" && <AdminVisitorPhotos />}
            {tool === "menus" && <AdminSuggestions />}
          </>
        )}
      </>
    );
  }

  if (tab !== "spots") return (
    <>
      <h1>Admin</h1>
      {tabs}
      {tab === "claims" ? <AdminClaims onChange={load} /> : tab === "collections" ? <Collections spots={spots} /> : <Reports spots={spots} />}
    </>
  );

  return (
    <>
      <h1>Admin</h1>
      {tabs}
      <div className="row between"><h2 style={{ margin: 0 }}>Spots ({spots.length})</h2>
        <button className="btn sm" onClick={() => setEditing({ ...BLANK })}><Ico n="plus" size={16} />Add spot</button></div>
      <p className="muted small" style={{ marginTop: 6 }}>Add places you have visited and checked. Mark them Verified once the menu and prices are confirmed.</p>
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
                    {s.booking_enabled && <span className="badge book">Booking</span>}{" "}
                    {s.google_place_id ? <span className="badge book">Google</span> : <span className="badge grey">No Google</span>}</td>
                <td className="small">{s.owner_id ? (s.owner_paid_until ? `Owner until ${new Date(s.owner_paid_until).toLocaleDateString("en-GB")}` : "Claimed") : <button className="linkbtn" onClick={() => owner(s)}>Set owner</button>}</td>
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
  const pickGoogle = (g) => { setF({ ...f, google_place_id: g.id, name: f.name || g.name, lat: g.lat ?? f.lat, lng: g.lng ?? f.lng }); setGRes(null); };
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value });
  const chk = (k) => (e) => setF({ ...f, [k]: e.target.checked });
  const toggleMood = (m) => setF({ ...f, moods: f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m] });
  const menuText = menuToText(f.menu);
  const setMenuText = (t) => setF({ ...f, menu: parseMenu(t) });

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
      <button className="linkbtn" style={{ marginTop: 16 }} onClick={() => onDone()}>Back to list</button>
      <h1>{isNew ? "Add a spot" : `Edit ${initial.name}`}</h1>
      <div className="card pad">
        <div className="field" style={{ background: "var(--cream)", padding: 12, borderRadius: 12 }}>
          <span>Find it on Google Maps (fills the name and map position, and shows live photos, rating and hours)</span>
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
              <span><b>{g.name}</b><br /><span className="small muted">{g.type ? g.type + ", " : ""}{g.address}</span></span>
            </button>
          )) : <div className="small muted" style={{ marginTop: 6 }}>No match on Google. Try another name.</div>)}
        </div>
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
        <p className="small muted" style={{ marginTop: -4 }}>Tip: "Find it on Google Maps" above fills the map position for you.</p>
        <FeaturePicker value={f.features || []} onChange={(features) => setF({ ...f, features })} />
        <LinksFields f={f} set={(patch) => setF((x) => ({ ...x, ...patch }))} />
        <PhotoSuggest spot={f} onAdd={(url, meta, website) => setF((x) => ({ ...x, photos: [...(x.photos || []), url].slice(0, 12),
          photo_info: { ...(x.photo_info || {}), [url]: meta }, website: x.website || website || "" }))} />
        <PhotoManager spot={isNew ? { ...f, id: "" } : f} onChange={(photos) => setF((x) => ({ ...x, photos }))} />
        <label className="field"><span>About</span><textarea className="input" rows={3} value={f.about} onChange={set("about")} /></label>
        <label className="field"><span>Video link (TikTok / Instagram / YouTube)</span><input className="input" value={f.video_url || ""} onChange={set("video_url")} /></label>
        <div className="field"><span>Moods</span>
          <div className="row" style={{ gap: 6 }}>{MOODS.map((m) => <button key={m} className={"chip" + (f.moods.includes(m) ? " on" : "")} onClick={() => toggleMood(m)}>{m}</button>)}</div></div>
        <label className="field"><span>Menu (one per line: Item | Price | labels). Labels: veg, vegan, halal, nuts, spicy1, spicy2, spicy3, star</span>
          <textarea className="input" rows={4} defaultValue={menuText} onBlur={(e) => setMenuText(e.target.value)} placeholder={"Chicken kottu | 850 | spicy2, star\nVegetable kottu | 700 | veg\nIced Milo | 400"} /></label>
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
