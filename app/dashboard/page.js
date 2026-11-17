"use client";
import { Ico } from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { MOODS } from "@/lib/seed";
import { RewardsTab, ReviewsTab, FeaturePicker } from "@/components/OwnerExtras";
import PhotoManager from "@/components/PhotoManager";
import { CONFIG } from "@/lib/config";
import { LinksFields } from "@/components/OfficialLinks";
import { niceTime, nextDays, todayIso, bookingSlots, STATUS_LABEL, parseMenu } from "@/lib/utils";

const STATUS_BADGE = { confirmed: "", requested: "warn", declined: "red", cancelled: "grey", arrived: "book", no_show: "red" };

export default function Dashboard() {
  const user = useUser();
  const [spots, setSpots] = useState(null);
  const [sel, setSel] = useState("");
  const [tab, setTab] = useState("bookings");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user === null) goLogin();
    if (user && (user.role === "owner" || user.role === "admin"))
      db.ownerSpots().then((l) => { setSpots(l); if (l.length && !sel) setSel(l[0].id); }).catch((e) => setErr(e.message));
  }, [user]); // eslint-disable-line

  if (user === undefined || user === null) return <div className="loading">Loading...</div>;
  if (user.role === "user")
    return (
      <div className="empty"><div className="big"><Ico n="store" size={30} /></div>
        <h1 className="empty-title">This page is for business owners</h1><p style={{ margin: "0 0 14px" }}>Run a restaurant or café on Fyndo? Claim it to manage its page.</p>
        <Link className="btn" href="/claim">Claim your place</Link>
      </div>
    );
  if (err) return <div className="narrow"><h1>Business dashboard</h1><div className="alert">{err}</div></div>;
  if (!spots) return <div className="loading">Loading your places...</div>;
  if (!spots.length) return <div className="empty"><div className="big"><Ico n="store" size={30} /></div><h1 className="empty-title">No places linked to your account yet</h1></div>;

  const spot = spots.find((s) => s.id === sel) || spots[0];
  const refresh = (patch) => setSpots(spots.map((s) => (s.id === spot.id ? { ...s, ...patch } : s)));

  return (
    <>
      <h1>Business dashboard</h1>
      <div className="row">
        {spots.length > 1 ? (
          <select className="input" style={{ width: "auto" }} value={spot.id} onChange={(e) => setSel(e.target.value)}>
            {spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : <b>{spot.name}</b>}
        <Link className="linkbtn" href={`/spot?id=${spot.id}`}>View public page</Link>
      </div>
      <PlanNote spot={spot} admin={user.role === "admin"} />
      <Stats spotId={spot.id} />
      <div className="tabs-in">
        {[["bookings", "Bookings"], ["rewards", "Rewards & QR"], ["reviews", "Reviews & tips"], ["settings", "Booking settings"], ["page", "Edit page & menu"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "bookings" && <Bookings spot={spot} />}
      {tab === "rewards" && <RewardsTab spot={spot} onSaved={refresh} />}
      {tab === "reviews" && <ReviewsTab spot={spot} />}
      {tab === "settings" && <Settings spot={spot} onSaved={refresh} />}
      {tab === "page" && <EditPage spot={spot} onSaved={refresh} />}
    </>
  );
}

// Yearly owner plan: when it ends, and a nudge to renew in the last month.
function PlanNote({ spot, admin }) {
  if (admin || !spot.owner_paid_until) return null;
  const end = new Date(spot.owner_paid_until);
  const days = Math.ceil((end - new Date()) / 86400000);
  const when = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const renew = <Link className="linkbtn" href={`/claim?id=${encodeURIComponent(spot.id)}`}>Renew for {CONFIG.owner.months} months</Link>;
  if (days < 0) return <div className="alert">Your owner plan ended on {when}, so changes can&apos;t be saved. {renew}.</div>;
  if (days <= 30) return <div className="alert">Your owner plan ends on {when} ({days} day{days === 1 ? "" : "s"} left). {renew}.</div>;
  return <p className="small muted" style={{ margin: "6px 0 0" }}>Owner plan active until {when}.</p>;
}

function Stats({ spotId }) {
  const [s, setS] = useState(null);
  useEffect(() => { db.spotStats(spotId).then(setS).catch(() => setS(null)); }, [spotId]);
  if (!s) return null;
  return (
    <div className="stats" style={{ marginTop: 14 }}>
      <div className="stat"><b>{s.saves}</b><span className="small">Saves</span></div>
      <div className="stat"><b>{s.bookings}</b><span className="small">Bookings</span></div>
      <div className="stat"><b>{s.arrived}</b><span className="small">Arrived</span></div>
      <div className="stat"><b>{s.noShows}</b><span className="small">No-shows</span></div>
    </div>
  );
}

function Bookings({ spot }) {
  const [list, setList] = useState(null);
  const [view, setView] = useState("today");
  const [adding, setAdding] = useState(false);
  const load = () => db.spotBookings(spot.id).then(setList);
  useEffect(() => { load(); }, [spot.id]); // eslint-disable-line

  if (!list) return <div className="loading">Loading bookings...</div>;
  const today = todayIso();
  const shown = list.filter((b) =>
    view === "today" ? b.date === today :
    view === "requests" ? b.status === "requested" :
    view === "upcoming" ? b.date >= today && ["confirmed", "requested"].includes(b.status) : true);
  const requests = list.filter((b) => b.status === "requested").length;
  const set = async (b, status) => { await db.updateBookingStatus(b.id, status); load(); };

  return (
    <>
      <div className="row between">
        <div className="chips">
          {[["today", "Today"], ["requests", `Requests (${requests})`], ["upcoming", "Upcoming"], ["all", "All"]].map(([k, l]) => (
            <button key={k} className={"chip" + (view === k ? " on" : "")} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        <button className="btn sm ghost" onClick={() => setAdding(!adding)}>+ Walk-in / phone booking</button>
      </div>
      {adding && <WalkIn spot={spot} onDone={() => { setAdding(false); load(); }} />}
      {!spot.booking_enabled && <div className="alert">Online booking is OFF. Customers see Call / WhatsApp instead. Turn it on in Booking settings.</div>}
      {shown.length === 0 ? <div className="empty">No bookings here.</div> : (
        <div className="stack" style={{ marginTop: 10 }}>
          {shown.map((b) => (
            <div key={b.id} className="card bk">
              <div>
                <b>{b.date === today ? "Today" : b.date} at {niceTime(b.time)}</b> <span className="small muted">Ref {b.ref_code}</span>
                <div className="small">{b.guest_name}, {b.guests} guests, <a href={`tel:${b.guest_phone}`} className="linkbtn">{b.guest_phone}</a></div>
                {b.note && <div className="small muted">“{b.note}”</div>}
                <div className="small muted">Source: {b.source}</div>
              </div>
              <div className="row">
                <span className={"badge " + (STATUS_BADGE[b.status] || "")}>{STATUS_LABEL[b.status]}</span>
                {b.status === "requested" && (<>
                  <button className="btn sm" onClick={() => set(b, "confirmed")}>Accept</button>
                  <button className="btn sm danger" onClick={() => set(b, "declined")}>Decline</button>
                </>)}
                {b.status === "confirmed" && (<>
                  <button className="btn sm dark" onClick={() => set(b, "arrived")}>Arrived</button>
                  <button className="btn sm danger" onClick={() => set(b, "no_show")}>No-show</button>
                </>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WalkIn({ spot, onDone }) {
  const days = nextDays(7);
  const slots = bookingSlots(spot);
  const [f, setF] = useState({ name: "", phone: "", guests: 2, date: days[0].iso, time: slots[0] || "19:00", note: "", source: "phone" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.name) return setErr("Add a name.");
    try { await db.addWalkIn(spot.id, { ...f, guests: Number(f.guests) }); onDone(); } catch (e) { setErr(e.message); }
  };
  return (
    <div className="card pad" style={{ margin: "10px 0" }}>
      <div className="grid2">
        <label className="field"><span>Name</span><input className="input" value={f.name} onChange={set("name")} /></label>
        <label className="field"><span>Phone</span><input className="input" value={f.phone} onChange={set("phone")} /></label>
        <label className="field"><span>Date</span>
          <select className="input" value={f.date} onChange={set("date")}>{days.map((d) => <option key={d.iso} value={d.iso}>{d.label}</option>)}</select></label>
        <label className="field"><span>Time</span>
          <select className="input" value={f.time} onChange={set("time")}>{slots.map((t) => <option key={t} value={t}>{niceTime(t)}</option>)}</select></label>
        <label className="field"><span>Guests</span><input className="input" type="number" min="1" value={f.guests} onChange={set("guests")} /></label>
        <label className="field"><span>Type</span>
          <select className="input" value={f.source} onChange={set("source")}><option value="phone">Phone booking</option><option value="walk-in">Walk-in</option></select></label>
      </div>
      {err && <div className="alert">{err}</div>}
      <button className="btn sm" onClick={save}>Add booking</button>
    </div>
  );
}

function Settings({ spot, onSaved }) {
  const [f, setF] = useState(spot);
  const [msg, setMsg] = useState("");
  useEffect(() => setF(spot), [spot.id]); // eslint-disable-line
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value });
  const save = async () => {
    const patch = { booking_enabled: f.booking_enabled, booking_mode: f.booking_mode, tables_for_booking: f.tables_for_booking,
      max_party: f.max_party, slot_minutes: f.slot_minutes, booking_start: f.booking_start, booking_end: f.booking_end, cancel_hours: f.cancel_hours };
    try { await db.updateSpot(spot.id, patch); onSaved(patch); setMsg("Saved"); } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="card pad narrow" style={{ margin: 0 }}>
      <div className="row between" style={{ background: "var(--cream)", padding: 12, borderRadius: 12, marginBottom: 14 }}>
        <div><b>Accept bookings on Fyndo</b><div className="small muted">Off = customers see Call / WhatsApp buttons</div></div>
        <label className="switch"><input type="checkbox" checked={!!f.booking_enabled} onChange={(e) => setF({ ...f, booking_enabled: e.target.checked })} /><span /></label>
      </div>
      <label className="field"><span>Booking mode</span>
        <select className="input" value={f.booking_mode} onChange={set("booking_mode")}>
          <option value="instant">Instant confirm (customer gets the table straight away)</option>
          <option value="request">Request & approve (you accept each booking)</option>
        </select></label>
      <div className="grid2">
        <label className="field"><span>Tables per time slot</span><input className="input" type="number" min="1" value={f.tables_for_booking} onChange={set("tables_for_booking", true)} /></label>
        <label className="field"><span>Max party size</span><input className="input" type="number" min="1" value={f.max_party} onChange={set("max_party", true)} /></label>
        <label className="field"><span>First booking time</span><input className="input" type="time" value={f.booking_start} onChange={set("booking_start")} /></label>
        <label className="field"><span>Last booking time</span><input className="input" type="time" value={f.booking_end} onChange={set("booking_end")} /></label>
        <label className="field"><span>Slot length</span>
          <select className="input" value={f.slot_minutes} onChange={set("slot_minutes", true)}>{[15, 30, 60].map((n) => <option key={n} value={n}>Every {n} min</option>)}</select></label>
        <label className="field"><span>Free cancel up to (hours)</span><input className="input" type="number" min="0" value={f.cancel_hours} onChange={set("cancel_hours", true)} /></label>
      </div>
      <button className="btn" onClick={save}>Save settings</button> <span className="small">{msg}</span>
    </div>
  );
}

function EditPage({ spot, onSaved }) {
  const [f, setF] = useState(spot);
  const [msg, setMsg] = useState("");
  useEffect(() => setF(spot), [spot.id]); // eslint-disable-line
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value });
  const menu = f.menu || [];
  const setMenu = (i, k, v) => setF({ ...f, menu: menu.map((m, j) => (j === i ? { ...m, [k]: k === "price" ? Number(v) : v } : m)) });
  const toggleMood = (m) => setF({ ...f, moods: f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m] });
  const save = async () => {
    const patch = { about: f.about, open_time: f.open_time, close_time: f.close_time, video_url: f.video_url, phone: f.phone,
      whatsapp: f.whatsapp, price_min: f.price_min, price_max: f.price_max, moods: f.moods, features: f.features || [],
      menu: menu.filter((m) => m.item), menu_updated_at: todayIso() };
    // Link columns arrive with schema_v6.sql; only send the ones this database has (or the owner filled in).
    ["website", "facebook_url", "instagram_url", "instagram_posts"].forEach((k) => { if (f[k] !== undefined) patch[k] = f[k]; });
    try { await db.updateSpot(spot.id, patch); onSaved(patch); setMsg("Saved"); } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="card pad narrow" style={{ margin: 0 }}>
      <label className="field"><span>About</span><textarea className="input" rows={3} value={f.about} onChange={set("about")} /></label>
      <label className="field"><span>Video link (TikTok, Instagram Reel or YouTube)</span>
        <input className="input" value={f.video_url || ""} onChange={set("video_url")} placeholder="https://www.tiktok.com/@fyndo/video/..." /></label>
      <div className="grid2">
        <label className="field"><span>Opens</span><input className="input" type="time" value={f.open_time} onChange={set("open_time")} /></label>
        <label className="field"><span>Closes</span><input className="input" type="time" value={f.close_time} onChange={set("close_time")} /></label>
        <label className="field"><span>Phone</span><input className="input" value={f.phone || ""} onChange={set("phone")} /></label>
        <label className="field"><span>WhatsApp (94771234567)</span><input className="input" value={f.whatsapp || ""} onChange={set("whatsapp")} /></label>
        <label className="field"><span>Price from (LKR per person)</span><input className="input" type="number" value={f.price_min} onChange={set("price_min", true)} /></label>
        <label className="field"><span>Price to (LKR per person)</span><input className="input" type="number" value={f.price_max} onChange={set("price_max", true)} /></label>
      </div>
      <div className="field"><span>Good for</span>
        <div className="row" style={{ gap: 6 }}>{MOODS.map((m) => <button key={m} className={"chip" + (f.moods.includes(m) ? " on" : "")} onClick={() => toggleMood(m)}>{m}</button>)}</div>
      </div>
      <FeaturePicker value={f.features || []} onChange={(features) => setF({ ...f, features })} />
      <LinksFields f={f} set={(patch) => setF((x) => ({ ...x, ...patch }))} />
      <PhotoManager spot={f} onChange={(photos) => { setF((x) => ({ ...x, photos })); onSaved({ photos }); }} />
      <div className="field"><span>Menu & prices</span>
        {menu.map((m, i) => (
          <div key={i} className="row" style={{ marginBottom: 6, flexWrap: "nowrap" }}>
            <input className="input" value={m.item} onChange={(e) => setMenu(i, "item", e.target.value)} placeholder="Item" />
            <input className="input" style={{ width: 100 }} type="number" value={m.price} onChange={(e) => setMenu(i, "price", e.target.value)} placeholder="LKR" />
            <input className="input" style={{ width: 150 }} value={(m.tags || []).join(", ")} onChange={(e) => setMenu(i, "tags", parseMenu("x|0|" + e.target.value)[0].tags || [])} placeholder="veg, spicy2, star" title="Labels: veg, vegan, halal, nuts, spicy1-3, star (signature)" />
            <button className="linkbtn" onClick={() => setF({ ...f, menu: menu.filter((_, j) => j !== i) })} aria-label="Remove item"><Ico n="close" size={16} /></button>
          </div>
        ))}
        <button className="btn sm ghost" onClick={() => setF({ ...f, menu: [...menu, { item: "", price: 0 }] })}>+ Add item</button>
      </div>
      <button className="btn" onClick={save}>Save page</button> <span className="small">{msg}</span>
    </div>
  );
}
