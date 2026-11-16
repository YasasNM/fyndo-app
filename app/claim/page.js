"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ico } from "@/components/Icon";
import { db } from "@/lib/data";
import { useUser, useSpots, goLogin } from "@/lib/hooks";
import { CONFIG } from "@/lib/config";
import { compressImage } from "@/lib/photos";
import { CardMedia } from "@/components/SpotCard";
import { CLAIM_STATUS } from "@/components/AdminClaims";

const ROLES = ["Owner", "Manager", "Marketing / staff with permission"];
const lkr = (n) => "LKR " + Number(n || 0).toLocaleString("en-US");
const OPEN = ["submitted", "paid"];

// Documents can be a PDF (as is) or a photo (shrunk, but kept sharp enough to read).
async function prepareFile(file) {
  if (!file) throw new Error("Choose a file first.");
  if (file.type === "application/pdf") {
    if (file.size > 5 * 1024 * 1024) throw new Error("That PDF is too big. Use one under 5 MB.");
    return file;
  }
  if (!/^image\//.test(file.type)) throw new Error("Use a photo (JPG, PNG) or a PDF.");
  return compressImage(file, 2200, 0.86);
}

export default function ClaimWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><ClaimPage /></Suspense>;
}

function ClaimPage() {
  const id = useSearchParams().get("id");
  const user = useUser();
  const [claims, setClaims] = useState(null);
  const reload = () => db.myClaims().then(setClaims).catch(() => setClaims([]));
  useEffect(() => { if (user === null) goLogin(); if (user) reload(); }, [user]);

  if (user === undefined || user === null || claims === null) return <div className="loading">Loading...</div>;
  if (!id) return <MyClaims claims={claims} />;
  const open = claims.find((c) => c.spot_id === id && OPEN.includes(c.status));
  const last = claims.find((c) => c.spot_id === id);
  return open ? <ClaimStatus claim={open} onChange={reload} /> : <NewClaim spotId={id} user={user} onDone={reload} rejected={last && last.status === "rejected" ? last : null} />;
}

// ---------- the person's claims, and a way to find their place ----------
function MyClaims({ claims }) {
  const { spots } = useSpots();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2 || !spots) return [];
    return spots.filter((s) => (s.name + " " + s.area).toLowerCase().includes(t)).slice(0, 8);
  }, [q, spots]);
  return (
    <div className="narrow">
      <h1>Your business on Fyndo</h1>
      <p className="lede-sm">Claim your place to keep its menu, prices, photos and opening hours right, take table bookings and reply to reviews.</p>
      <HowItWorks />
      <label className="field" style={{ marginTop: 18 }}><span>Find your place</span>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type its name, e.g. Kottu Corner" autoComplete="off" /></label>
      {matches.length > 0 && (
        <div className="stack">
          {matches.map((s) => (
            <Link key={s.id} href={`/claim?id=${encodeURIComponent(s.id)}`} className="opt" style={{ marginBottom: 0 }}>
              <span className="em"><Ico n="store" size={18} /></span>
              <span><b>{s.name}</b><br /><span className="small muted">{s.area}{s.owner_id ? ", already has an owner" : ""}</span></span>
            </Link>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && spots && matches.length === 0 && (
        <p className="small muted">Not on Fyndo yet? Email <a className="linkbtn" href={`mailto:${CONFIG.email}?subject=${encodeURIComponent("Add my place to Fyndo")}`}>{CONFIG.email}</a> and we will add it.</p>
      )}
      <h2>Your claims</h2>
      {claims.length === 0 ? <p className="small muted">You have not claimed a place yet.</p> : (
        <div className="stack">
          {claims.map((c) => {
            const st = CLAIM_STATUS[c.status] || { label: c.status, cls: "grey" };
            return (
              <Link key={c.id} href={`/claim?id=${encodeURIComponent(c.spot_id)}`} className="card pad row between" style={{ color: "inherit" }}>
                <span><b>{c.spot ? c.spot.name : c.spot_id}</b><br /><span className="small muted">Ref {c.ref}</span></span>
                <span className={"badge " + st.cls}>{st.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <ol className="claimsteps-info">
      <li><b>Tell us who you are</b><span className="small muted">Your name, role and a phone number we can call.</span></li>
      <li><b>Show it is your place</b><span className="small muted">A business registration, a bill in the business name, or a photo of you at the counter.</span></li>
      <li><b>Pay the yearly fee</b><span className="small muted">{lkr(CONFIG.owner.feeLkr)} for {CONFIG.owner.months} months, by bank transfer.</span></li>
      <li><b>We check and switch it on</b><span className="small muted">Usually within 2 working days. Then your Business dashboard opens.</span></li>
    </ol>
  );
}

// ---------- new claim: details, then proof ----------
function NewClaim({ spotId, user, onDone, rejected }) {
  const [spot, setSpot] = useState(undefined);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ contact_name: user.name || "", job_role: ROLES[0], phone: user.phone || "", business_email: "", reg_no: "", note: "" });
  const [file, setFile] = useState(null);
  const [agree, setAgree] = useState(false);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [renew, setRenew] = useState(false);
  useEffect(() => { db.getSpot(spotId).then(setSpot).catch(() => setSpot(null)); }, [spotId]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (spot === undefined) return <div className="loading">Loading...</div>;
  if (!spot) return <div className="empty"><div className="big"><Ico n="pin" size={30} /></div>This place was not found. <Link className="linkbtn" href="/claim">Find your place</Link></div>;
  const taken = spot.owner_id && spot.owner_id !== user.id && !(spot.owner_paid_until && new Date(spot.owner_paid_until) < new Date());
  if (taken) return (
    <div className="narrow">
      <h1>{spot.name} already has an owner</h1>
      <p>Someone has already verified this page. If that is wrong, email <a className="linkbtn" href={`mailto:${CONFIG.email}?subject=${encodeURIComponent("Owner of " + spot.name)}`}>{CONFIG.email}</a> and we will look into it.</p>
      <Link className="btn ghost" href={`/spot?id=${spot.id}`}>Back to {spot.name}</Link>
    </div>
  );
  const daysLeft = spot.owner_paid_until ? Math.ceil((new Date(spot.owner_paid_until) - new Date()) / 86400000) : Infinity;
  if (spot.owner_id === user.id && daysLeft >= 0 && !renew) return (
    <div className="narrow">
      <h1>You manage {spot.name}</h1>
      <p>Your page is active{spot.owner_paid_until ? ` until ${new Date(spot.owner_paid_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.</p>
      <div className="row" style={{ gap: 10 }}>
        <Link className="btn" href="/dashboard">Open Business dashboard</Link>
        {daysLeft <= 30 && <button className="btn ghost" onClick={() => setRenew(true)}>Renew for another year</button>}
      </div>
    </div>
  );

  const check1 = () => {
    const e = {};
    if (f.contact_name.trim().length < 2) e.contact_name = "Add your full name.";
    if (f.phone.replace(/\D/g, "").length < 9) e.phone = "Add a phone number we can call, e.g. 0771234567.";
    if (f.business_email && !/^\S+@\S+\.\S+$/.test(f.business_email.trim())) e.business_email = "This email looks incomplete.";
    setErrs(e);
    return !Object.keys(e).length;
  };
  const send = async () => {
    setErr("");
    const e = {};
    if (!file) e.file = "Add one document or photo that shows you run this place.";
    if (!agree) e.agree = "Please confirm you are allowed to manage this page.";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    let claim = null;
    try {
      const ready = await prepareFile(file);
      claim = await db.submitClaim({ spotId, ...f });
      await db.uploadClaimFile(claim.id, "proof", ready);
      await onDone();
    } catch (x) {
      // If the claim went in but the file did not, the status page lets them upload it again.
      if (claim) { setErr("Your claim was sent, but the file did not upload: " + x.message + " You can add it on the next screen."); await onDone(); }
      else setErr(x.message);
    }
    setBusy(false);
  };

  return (
    <div className="narrow">
      <Link href={`/spot?id=${spot.id}`} className="small muted">Back to {spot.name}</Link>
      <h1 style={{ marginTop: 6 }}>Claim {spot.name}</h1>
      {rejected && (
        <div className="alert">Your last claim ({rejected.ref}) was not approved{rejected.admin_note ? `: ${rejected.admin_note}` : "."} You can send a new one with clearer proof.</div>
      )}
      <div className="claimhead card">
        <div className="claimhead-media"><CardMedia spot={spot} /></div>
        <div className="pad">
          <b>{lkr(CONFIG.owner.feeLkr)} a year</b>
          <p className="small muted" style={{ margin: "2px 0 0" }}>Update your menu and prices, add your own photos, take bookings and answer reviews. You pay after you send the claim.</p>
        </div>
      </div>
      <Steps step={step} />

      {step === 1 && (
        <form className="card pad" onSubmit={(e) => { e.preventDefault(); if (check1()) setStep(2); }} noValidate>
          <Field label="Your full name" err={errs.contact_name}><input className="input" value={f.contact_name} onChange={set("contact_name")} autoComplete="name" required /></Field>
          <Field label="Your role at this place">
            <select className="input" value={f.job_role} onChange={set("job_role")}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </Field>
          <Field label="Phone we can call to check" err={errs.phone}><input className="input" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" required /></Field>
          <Field label="Business email (optional)" hint="An address at the business's own website helps us check faster." err={errs.business_email}>
            <input className="input" type="email" value={f.business_email} onChange={set("business_email")} autoComplete="email" /></Field>
          <Field label="Business registration number (optional)"><input className="input" value={f.reg_no} onChange={set("reg_no")} placeholder="e.g. PV 00123456" /></Field>
          <Field label="Anything we should know (optional)"><textarea className="input" rows={2} maxLength={600} value={f.note} onChange={set("note")} /></Field>
          <div className="row between" style={{ marginTop: 6 }}>
            <span className="small muted">Step 1 of 3</span>
            <button className="btn">Continue</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="card pad">
          <p style={{ marginTop: 0 }}>Add <b>one</b> of these, so we know you run {spot.name}:</p>
          <ul className="small" style={{ paddingLeft: 18, marginTop: 0 }}>
            <li>Business registration (BR) certificate</li>
            <li>A utility bill, lease or tax letter in the business name</li>
            <li>A photo of you at the counter holding a paper with today&apos;s date and &quot;Fyndo&quot;</li>
          </ul>
          <Field label="Document or photo (JPG, PNG or PDF, up to 5 MB)" err={errs.file}>
            <input className="input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files && e.target.files[0])} />
          </Field>
          <p className="small muted" style={{ marginTop: -4 }}>Only the Fyndo team can see this file. It is never shown on your page.</p>
          <label className="row small" style={{ alignItems: "flex-start", flexWrap: "nowrap", marginTop: 8 }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I run this place, or the owner has allowed me to manage its Fyndo page.</span>
          </label>
          {errs.agree && <div className="fielderr">{errs.agree}</div>}
          {err && <div className="alert">{err}</div>}
          <div className="row between" style={{ marginTop: 14 }}>
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn" onClick={send} disabled={busy}>{busy ? "Sending..." : "Send claim"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ step }) {
  const names = ["Your details", "Proof", "Payment"];
  return (
    <ol className="claimsteps" aria-label="Claim steps">
      {names.map((n, i) => (
        <li key={n} className={i + 1 < step ? "done" : i + 1 === step ? "on" : ""} aria-current={i + 1 === step ? "step" : undefined}>
          <span className="claimsteps-n">{i + 1 < step ? <Ico n="check" size={14} strokeWidth={2.4} /> : i + 1}</span>{n}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, hint, err, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !err && <span className="small muted fieldhint">{hint}</span>}
      {err && <span className="fielderr">{err}</span>}
    </label>
  );
}

// ---------- after sending: payment and progress ----------
function ClaimStatus({ claim, onChange }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const spotName = claim.spot ? claim.spot.name : claim.spot_id;
  const subject = `Owner claim ${claim.ref} - ${spotName}`;
  const body = `Hi Fyndo,\n\nI sent an owner claim for ${spotName} (reference ${claim.ref}).\nPlease send me the bank details for the ${lkr(claim.fee_lkr)} yearly fee.\n\nName: ${claim.contact_name}\nPhone: ${claim.phone}\n`;
  const mail = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const upload = async (kind, file) => {
    setMsg(""); setBusy(kind);
    try { await db.uploadClaimFile(claim.id, kind, await prepareFile(file)); setMsg(kind === "receipt" ? "Receipt added. We will check it soon." : "Proof added."); await onChange(); }
    catch (e) { setMsg(e.message); }
    setBusy("");
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this claim? You can send a new one later.")) return;
    try { await db.cancelClaim(claim.id); await onChange(); } catch (e) { setMsg(e.message); }
  };
  const paid = claim.status === "paid";
  return (
    <div className="narrow">
      <Link href="/claim" className="small muted">Your claims</Link>
      <h1 style={{ marginTop: 6 }}>Claim for {spotName}</h1>
      <Steps step={3} />
      <div className="card pad">
        <div className="row between"><span className="small muted">Your reference</span><b className="claimref">{claim.ref}</b></div>
        <ol className="claimtrack">
          <li className="done"><b>Claim sent</b><span className="small muted">{new Date(claim.created_at).toLocaleDateString("en-GB")}</span></li>
          <li className={paid ? "done" : "on"}><b>{paid ? "Payment received" : "Waiting for your payment"}</b>
            {!paid && <span className="small muted">{lkr(claim.fee_lkr)} for {CONFIG.owner.months} months</span>}</li>
          <li className={paid ? "on" : ""}><b>We check and switch on your page</b><span className="small muted">Usually within 2 working days</span></li>
        </ol>
      </div>

      {!paid && (
        <div className="card pad paybox">
          <h2 style={{ marginTop: 0 }}>Pay by bank transfer</h2>
          <ol className="small" style={{ paddingLeft: 18, margin: "0 0 12px" }}>
            <li>Email us with your reference <b>{claim.ref}</b>. We reply with our bank details.</li>
            <li>Transfer {lkr(claim.fee_lkr)} and use <b>{claim.ref}</b> as the payment note.</li>
            <li>Add a photo of the receipt below, or reply to our email with it.</li>
          </ol>
          <div className="row" style={{ gap: 10 }}>
            <a className="btn" href={mail}><Ico n="chat" size={18} />Email {CONFIG.email}</a>
          </div>
          <FilePick label={claim.receipt_path ? "Receipt added. Replace it" : "Add payment receipt"} busy={busy === "receipt"} onPick={(f) => upload("receipt", f)} />
        </div>
      )}

      {!claim.proof_path && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <b>Proof still needed</b>
          <p className="small muted" style={{ margin: "4px 0 8px" }}>Add a business registration, a bill in the business name, or a photo of you at the counter.</p>
          <FilePick label="Add proof" busy={busy === "proof"} onPick={(f) => upload("proof", f)} />
        </div>
      )}
      {msg && <div className={"alert" + (/added/.test(msg) ? " ok" : "")}>{msg}</div>}
      <p className="small muted" style={{ marginTop: 16 }}>
        Questions? <a className="linkbtn" href={`mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}`}>{CONFIG.email}</a>
        {"  "}<button className="linkbtn" style={{ marginLeft: 12, color: "var(--chili)" }} onClick={cancel}>Cancel claim</button>
      </p>
    </div>
  );
}

function FilePick({ label, busy, onPick }) {
  return (
    <label className={"btn ghost sm filepick" + (busy ? " busy" : "")} style={{ marginTop: 12 }}>
      <Ico n="plus" size={16} />{busy ? "Uploading..." : label}
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={busy}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onPick(f); }} />
    </label>
  );
}
