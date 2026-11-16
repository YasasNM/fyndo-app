"use client";
import { Ico } from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db, isLive } from "@/lib/data";
import { useUser } from "@/lib/hooks";
import { niceTime, STATUS_LABEL, toMin, todayIso } from "@/lib/utils";

const STATUS_BADGE = { confirmed: "", requested: "warn", declined: "red", cancelled: "grey", arrived: "book", no_show: "red" };

function InstallCard() {
  const [can, setCan] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setCan(!!window.__installPrompt);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const on = () => setCan(true);
    window.addEventListener("installable", on);
    return () => window.removeEventListener("installable", on);
  }, []);
  const install = async () => { const p = window.__installPrompt; if (p) { p.prompt(); await p.userChoice; setCan(false); } };
  return (
    <div className="card pad" style={{ background: "var(--cream)" }}>
      <b>Get the Fyndo app</b>
      <p className="small" style={{ margin: "4px 0 8px" }}>
        {ios ? "On iPhone: tap the Share button in Safari, then \"Add to Home Screen\"."
             : "Add Fyndo to your home screen. It opens like a normal app."}
      </p>
      {can && <button className="btn sm" onClick={install}>Install app</button>}
      {!can && !ios && <p className="small muted" style={{ margin: 0 }}>On Android Chrome: menu ⋮ then "Install app" or "Add to Home screen".</p>}
    </div>
  );
}

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    if (p1.length < 8 || !/[a-z]/i.test(p1) || !/\d/.test(p1)) return setMsg({ ok: false, t: "Use at least 8 characters, with letters and numbers." });
    if (p1 !== p2) return setMsg({ ok: false, t: "The two passwords don't match." });
    setBusy(true);
    try { await db.updatePassword(p1); setMsg({ ok: true, t: "Password changed." }); setP1(""); setP2(""); setOpen(false); }
    catch (e2) { setMsg({ ok: false, t: e2.message }); }
    setBusy(false);
  };
  return (
    <div style={{ marginTop: 12 }}>
      {msg && <div className={"alert" + (msg.ok ? " ok" : "")} role="status">{msg.t}</div>}
      {!open ? <button className="btn sm ghost" onClick={() => setOpen(true)}>Change password</button> : (
        <form className="card pad" onSubmit={save}>
          <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" required value={p1} onChange={(e) => setP1(e.target.value)} /></label>
          <label className="field"><span>Type it again</span><input className="input" type="password" autoComplete="new-password" required value={p2} onChange={(e) => setP2(e.target.value)} /></label>
          <div className="row"><button className="btn sm" disabled={busy}>{busy ? "Saving..." : "Save password"}</button><button type="button" className="btn sm ghost" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}

export default function Me() {
  const user = useUser();
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: "", phone: "" });
  const load = () => db.myBookings().then(setList);
  useEffect(() => { if (user) { load(); setF({ name: user.name || "", phone: user.phone || "" }); } }, [user]);

  if (user === undefined) return <div className="loading">Loading...</div>;
  if (!user) return (
    <div className="narrow">
      <div className="empty"><div className="big"><Ico n="user" size={30} /></div>Log in to see your bookings and profile.<br /><br />
        <Link href="/login?next=/me" className="btn">Log in or sign up</Link></div>
      <InstallCard />
    </div>
  );

  const nowKey = todayIso() + " " + new Date().toTimeString().slice(0, 5);
  const upcoming = list.filter((b) => b.date + " " + b.time >= nowKey && ["confirmed", "requested"].includes(b.status));
  const past = list.filter((b) => !upcoming.includes(b));
  const canCancel = (b) => {
    const hours = b.spot ? b.spot.cancel_hours : 2;
    const start = new Date(b.date + "T" + b.time + ":00").getTime();
    return start - Date.now() > hours * 3600 * 1000;
  };
  const cancel = async (b) => { await db.cancelBooking(b.id); load(); };
  const saveProfile = async () => { await db.updateProfile(f); setEdit(false); };

  const Row = ({ b }) => (
    <div className="card bk">
      <div>
        <b>{b.spot ? b.spot.name : "Spot"}</b>
        <div className="small muted">{b.date} at {niceTime(b.time)}, {b.guests} guests, ref {b.ref_code}</div>
      </div>
      <div className="row">
        <span className={"badge " + (STATUS_BADGE[b.status] || "")}>{STATUS_LABEL[b.status]}</span>
        {["confirmed", "requested"].includes(b.status) && (canCancel(b)
          ? <button className="btn sm danger" onClick={() => cancel(b)}>Cancel</button>
          : <span className="small muted">Too late to cancel in app, please call</span>)}
      </div>
    </div>
  );

  return (
    <div className="narrow">
      <h1>Hi, {user.name || user.email}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{user.email}, {user.role === "user" ? "Member" : user.role === "owner" ? "Business owner" : "Admin"}</p>

      {edit ? (
        <div className="card pad">
          <label className="field"><span>Name</span><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field"><span>Phone</span><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <div className="row"><button className="btn sm" onClick={saveProfile}>Save</button><button className="btn sm ghost" onClick={() => setEdit(false)}>Cancel</button></div>
        </div>
      ) : (
        <div className="row">
          <button className="btn sm ghost" onClick={() => setEdit(true)}>Edit profile</button>
          <button className="btn sm danger" onClick={async () => { await db.signOut(); window.location.href = "/"; }}>Log out</button>
        </div>
      )}
      {isLive && !edit && <ChangePassword />}

      <nav className="menu" aria-label="Your Fyndo">
        <Link href="/rewards"><Ico n="ticket" size={20} /><span><b>Rewards</b><span className="small muted">Points, stamp cards and badges</span></span></Link>
        {(user.role === "owner" || user.role === "admin") && <Link href="/dashboard"><Ico n="store" size={20} /><span><b>Business dashboard</b><span className="small muted">Bookings, QR poster, reviews</span></span></Link>}
        {user.role === "admin" && <Link href="/admin"><Ico n="shield" size={20} /><span><b>Admin</b><span className="small muted">Places, lists, reports, setup check</span></span></Link>}
        <Link href="/?tour=1"><Ico n="compass" size={20} /><span><b>Take the quick tour again</b><span className="small muted">Three short steps on the home page</span></span></Link>
      </nav>

      <h2>Upcoming bookings</h2>
      {upcoming.length ? <div className="stack">{upcoming.map((b) => <Row key={b.id} b={b} />)}</div>
        : <p className="muted small">No upcoming bookings. Find a spot with "Book a table".</p>}
      {past.length > 0 && (<><h2>Past and cancelled</h2><div className="stack">{past.map((b) => <Row key={b.id} b={b} />)}</div></>)}

      <h2>App</h2>
      <InstallCard />
      <p className="small muted" style={{ marginTop: 14 }}><Link className="linkbtn" href="/credits">Photo and data credits</Link></p>
      {!isLive && (
        <p className="small muted" style={{ marginTop: 16 }}>
          Demo mode. <button className="linkbtn" onClick={async () => { await db.resetDemo(); window.location.href = "/"; }}>Reset demo data</button>
        </p>
      )}
    </div>
  );
}
