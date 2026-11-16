"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";

// Opened from the password-reset email. Supabase signs the person in for this one purpose; they choose a new password.
export default function ResetPassword() {
  const [state, setState] = useState("checking"); // checking | ready | invalid | done
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => db.watchRecovery((ok) => setState(ok ? "ready" : "invalid")), []);

  const save = async (e) => {
    e.preventDefault(); setErr("");
    if (p1.length < 8 || !/[a-z]/i.test(p1) || !/\d/.test(p1)) return setErr("Use at least 8 characters, with letters and numbers.");
    if (p1 !== p2) return setErr("The two passwords don't match.");
    setBusy(true);
    try { await db.updatePassword(p1); setState("done"); } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  return (
    <div className="narrow" style={{ maxWidth: 440 }}>
      <h1>Choose a new password</h1>
      {state === "checking" && <div className="loading">Checking your link...</div>}
      {state === "invalid" && (
        <div className="card pad">
          <p style={{ marginTop: 0 }}>This reset link has expired or was already used. Links work once, for one hour.</p>
          <Link className="btn" href="/login">Send a new link</Link>
        </div>
      )}
      {state === "done" && (
        <div className="card pad">
          <div className="alert ok" role="status">Your password is changed and you're logged in.</div>
          <Link className="btn" href="/">Go to Fyndo</Link>
        </div>
      )}
      {state === "ready" && (
        <form className="card pad" onSubmit={save}>
          <label className="field"><span>New password</span>
            <span className="pwrap">
              <input className="input" type={show ? "text" : "password"} autoComplete="new-password" required value={p1} onChange={(e) => setP1(e.target.value)} aria-describedby="np-help" />
              <button type="button" className="pwtoggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
            </span>
            <span id="np-help" className="small muted" style={{ display: "block", marginTop: 4, fontWeight: 400 }}>At least 8 characters, with letters and numbers.</span>
          </label>
          <label className="field"><span>Type it again</span>
            <input className="input" type={show ? "text" : "password"} autoComplete="new-password" required value={p2} onChange={(e) => setP2(e.target.value)} /></label>
          {err && <div className="alert" role="alert">{err}</div>}
          <button className="btn block" disabled={busy}>{busy ? "Saving..." : "Save new password"}</button>
        </form>
      )}
    </div>
  );
}
