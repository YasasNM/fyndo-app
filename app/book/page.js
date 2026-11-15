"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/data";
import { useUser, goLogin } from "@/lib/hooks";
import { Thumb } from "@/components/SpotCard";
import { bookingSlots, nextDays, niceTime, toMin, todayIso, shareWa, STATUS_LABEL } from "@/lib/utils";

export default function BookPageWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><BookPage /></Suspense>;
}

function BookPage() {
  const params = useSearchParams();
  const id = params.get("id");
  const user = useUser();
  const days = nextDays(7);
  const [spot, setSpot] = useState(undefined);
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState(days[0].iso);
  const [time, setTime] = useState("");
  const [counts, setCounts] = useState({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    db.getSpot(id).then(setSpot).catch(() => setSpot(null));
    if (params.get("date")) setDate(params.get("date"));
    if (params.get("time")) setTime(params.get("time"));
  }, [id]); // eslint-disable-line
  useEffect(() => { if (user === null) goLogin(); if (user) { setName(user.name || ""); setPhone(user.phone || ""); } }, [user]);
  useEffect(() => { if (spot) db.getSlotCounts(spot.id, date).then(setCounts).catch(() => setCounts({})); }, [spot, date]);

  if (spot === undefined || user === undefined) return <div className="loading">Loading...</div>;
  if (!user) return <div className="loading">Taking you to log in...</div>;
  if (!spot) return <div className="empty">Spot not found.</div>;
  if (!spot.booking_enabled)
    return <div className="empty"><div className="big">📵</div>{spot.name} is not taking bookings on Fyndo right now.<br /><Link className="linkbtn" href={`/spot?id=${spot.id}`}>See other ways to contact them</Link></div>;

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const slots = bookingSlots(spot).map((t) => ({
    t,
    full: (counts[t] || 0) >= spot.tables_for_booking,
    past: date === todayIso() && toMin(t) <= nowMin + 30,
  }));
  const chosen = slots.find((s) => s.t === time && !s.full && !s.past);

  const submit = async () => {
    setErr("");
    if (!chosen) return setErr("Please pick a time.");
    if (!name.trim() || !/^[0-9+ ]{9,15}$/.test(phone.trim())) return setErr("Please add your name and a valid phone number.");
    setBusy(true);
    try {
      const b = await db.createBooking({ spotId: spot.id, guests, date, time, note, name: name.trim(), phone: phone.trim() });
      setDone(b);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (done) {
    const dl = (days.find((d) => d.iso === done.date) || { label: done.date }).label;
    const confirmed = done.status === "confirmed";
    return (
      <div className="narrow center">
        <div className="success" style={{ background: confirmed ? "var(--green)" : "var(--mango)" }}>{confirmed ? "✓" : "⏳"}</div>
        <h1>{confirmed ? "Table booked!" : "Request sent!"}</h1>
        <p className="muted">{confirmed ? "See you there." : `${spot.name} will reply soon. Check "My bookings" for updates.`}</p>
        <div className="card pad" style={{ textAlign: "left", margin: "16px 0" }}>
          <div className="kv"><span className="muted">Reference</span><b>{done.ref_code}</b></div>
          <div className="kv"><span className="muted">Place</span><b>{spot.name}</b></div>
          <div className="kv"><span className="muted">When</span><b>{dl}, {niceTime(done.time)}</b></div>
          <div className="kv"><span className="muted">Guests</span><b>{done.guests}</b></div>
          <div className="kv"><span className="muted">Status</span><b>{STATUS_LABEL[done.status]}</b></div>
        </div>
        <p className="small muted">Free to cancel up to {spot.cancel_hours} hours before.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <a className="btn" target="_blank" rel="noreferrer"
             href={shareWa(`Booked ${spot.name} on Fyndo for ${dl}, ${niceTime(done.time)} 💞 (Ref ${done.ref_code})`)}>Share with partner</a>
          <Link href="/me" className="btn ghost">My bookings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="narrow">
      <Link href={`/spot?id=${spot.id}`} className="small muted" style={{ display: "inline-block", marginTop: 16 }}>← Back</Link>
      <div className="row" style={{ margin: "10px 0 6px" }}>
        <Thumb spot={spot} className="mini" />
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Book a table</h1>
          <div className="muted small">{spot.name} · {spot.area}</div>
          <span className={"badge " + (spot.booking_mode === "instant" ? "" : "warn")}>
            {spot.booking_mode === "instant" ? "Instant confirm" : "Owner confirms"}
          </span>
        </div>
      </div>

      <div className="row between" style={{ margin: "18px 0" }}>
        <b>Guests</b>
        <div className="stepper">
          <button aria-label="Fewer guests" onClick={() => setGuests(Math.max(1, guests - 1))}>−</button>
          <b>{guests}</b>
          <button aria-label="More guests" onClick={() => setGuests(Math.min(spot.max_party, guests + 1))}>+</button>
        </div>
      </div>
      {guests >= spot.max_party && <p className="small muted">For groups bigger than {spot.max_party}, please call the place.</p>}

      <b>Date</b>
      <div className="days" style={{ margin: "8px 0 18px" }}>
        {days.map((d) => (
          <button key={d.iso} className={"day" + (date === d.iso ? " on" : "")} onClick={() => { setDate(d.iso); setTime(""); }}>
            <span className="small">{d.day}</span><b>{d.num}</b>
          </button>
        ))}
      </div>

      <b>Time</b>
      <div className="slots" style={{ margin: "8px 0 18px" }}>
        {slots.map((s) => (
          <button key={s.t} className={"slot" + (time === s.t ? " on" : "")} disabled={s.full || s.past} onClick={() => setTime(s.t)}>
            {niceTime(s.t)}{s.full ? " · full" : ""}
          </button>
        ))}
      </div>

      <div className="grid2">
        <label className="field"><span>Your name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Phone</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="077 123 4567" /></label>
      </div>
      <label className="field"><span>Note (optional)</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anniversary, window seat..." maxLength={140} />
      </label>

      {err && <div className="alert">{err}</div>}
      <p className="small muted">Free to cancel up to {spot.cancel_hours} hours before. Please cancel if you can't make it.</p>
      <button className="btn block" onClick={submit} disabled={busy}>
        {busy ? "Booking..." : spot.booking_mode === "instant" ? "Confirm booking" : "Send request"}
      </button>
    </div>
  );
}
