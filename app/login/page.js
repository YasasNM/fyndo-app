"use client";
import { useEffect, useState } from "react";
import { db, isLive } from "@/lib/data";
import { Ico } from "@/components/Icon";
import Photo from "@/components/Photo";

// Log in, sign up (with email confirmation), forgot password. One screen, several clear states.
// mode: in | up | forgot | check-signup | check-reset
export default function Login() {
  const [mode, setMode] = useState("in");
  const [f, setF] = useState({ email: "", password: "", password2: "", name: "", phone: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(null); // { text, code }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("confirmed") === "1") setNote("Your email is confirmed. You can log in now.");
  }, []);

  const go = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") ? next : "/";
  };
  const switchTo = (m) => { setMode(m); setErr(null); setNote(""); };
  const pwOk = (p) => p.length >= 8 && /[a-z]/i.test(p) && /\d/.test(p);

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setNote(""); setBusy(true);
    try {
      if (mode === "in") { await db.signIn(f.email, f.password); go(); }
      else if (mode === "up") {
        if (!f.name.trim()) throw Object.assign(new Error("Please add your name."), { code: "form" });
        if (isLive && !pwOk(f.password)) throw Object.assign(new Error("Use at least 8 characters, with letters and numbers."), { code: "form" });
        if (isLive && f.password !== f.password2) throw Object.assign(new Error("The two passwords don't match."), { code: "form" });
        const r = await db.signUp(f.email, f.password, f.name.trim(), f.phone.trim());
        if (r && r.needsConfirm) setMode("check-signup"); else go();
      } else if (mode === "forgot") {
        await db.sendPasswordReset(f.email);
        setMode("check-reset");
      }
    } catch (e2) { setErr({ text: e2.message, code: e2.code }); }
    setBusy(false);
  };
  const resend = async () => {
    setBusy(true); setErr(null);
    try { await db.resendConfirmation(f.email); setNote(`We sent a new confirmation link to ${f.email}.`); }
    catch (e2) { setErr({ text: e2.message, code: e2.code }); }
    setBusy(false);
  };
  const demoLogin = async (email) => { await db.signIn(email, "demo"); go(); };

  const title = { in: "Welcome back", up: "Create your account", forgot: "Reset your password", "check-signup": "Check your email", "check-reset": "Check your email" }[mode];

  return (
    <div className="narrow" style={{ maxWidth: 440 }}>
      <Photo slug="rice-curry" className="authphoto" />
      <h1>{title}</h1>

      {mode === "check-signup" && (
        <div className="card pad">
          <p style={{ marginTop: 0 }}>We sent a confirmation link to <b>{f.email}</b>. Open it on this phone or computer to finish creating your account.</p>
          <p className="small muted">No email after a few minutes? Check spam or promotions, then send it again.</p>
          {note && <div className="alert ok">{note}</div>}
          {err && <div className="alert">{err.text}</div>}
          <div className="row">
            <button className="btn" onClick={resend} disabled={busy}>{busy ? "Sending..." : "Send the link again"}</button>
            <button className="btn ghost" onClick={() => switchTo("in")}>Back to log in</button>
          </div>
        </div>
      )}

      {mode === "check-reset" && (
        <div className="card pad">
          <p style={{ marginTop: 0 }}>If <b>{f.email}</b> has a Fyndo account, we sent a link to reset the password. The link works once and expires after an hour.</p>
          <div className="row">
            <button className="btn ghost" onClick={() => setMode("forgot")}>Use a different email</button>
            <button className="btn ghost" onClick={() => switchTo("in")}>Back to log in</button>
          </div>
        </div>
      )}

      {(mode === "in" || mode === "up" || mode === "forgot") && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {mode === "forgot" ? "Enter the email you signed up with. We'll send you a link to choose a new password." : "Save places, plan dates and book tables."}
          </p>

          {!isLive && mode !== "forgot" && (
            <div className="card pad" style={{ margin: "16px 0", background: "var(--cream)" }}>
              <b>Demo logins (one tap)</b>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => demoLogin("user@demo.lk")}>User</button>
                <button className="btn sm dark" onClick={() => demoLogin("owner@demo.lk")}>Restaurant owner</button>
                <button className="btn sm dark" onClick={() => demoLogin("admin@demo.lk")}>Admin</button>
              </div>
            </div>
          )}

          {note && <div className="alert ok">{note}</div>}

          <form onSubmit={submit} className="card pad" noValidate={false}>
            {mode === "up" && (
              <>
                <label className="field"><span>Name</span><input className="input" autoComplete="name" value={f.name} onChange={set("name")} required /></label>
                <label className="field"><span>Phone (for bookings, optional)</span><input className="input" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="077 123 4567" /></label>
              </>
            )}
            <label className="field"><span>Email</span><input className="input" type="email" autoComplete="email" required value={f.email} onChange={set("email")} /></label>
            {mode !== "forgot" && (
              <label className="field">
                <span className="row between" style={{ display: "flex" }}>
                  Password
                  {mode === "in" && <button type="button" className="linkbtn" onClick={() => switchTo("forgot")}>Forgot password?</button>}
                </span>
                <span className="pwrap">
                  <input className="input" type={show ? "text" : "password"} autoComplete={mode === "up" ? "new-password" : "current-password"}
                    required={isLive} value={f.password} onChange={set("password")} aria-describedby={mode === "up" ? "pwhelp" : undefined} />
                  <button type="button" className="pwtoggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
                </span>
                {mode === "up" && <span id="pwhelp" className="small muted" style={{ display: "block", marginTop: 4, fontWeight: 400 }}>At least 8 characters, with letters and numbers.</span>}
              </label>
            )}
            {mode === "up" && isLive && (
              <label className="field"><span>Type the password again</span>
                <input className="input" type={show ? "text" : "password"} autoComplete="new-password" required value={f.password2} onChange={set("password2")} /></label>
            )}
            {err && (
              <div className="alert" role="alert">
                <span>{err.text}{" "}
                  {err.code === "unconfirmed" && <button type="button" className="linkbtn" onClick={resend} disabled={busy}>Send the link again</button>}
                  {err.code === "exists" && <button type="button" className="linkbtn" onClick={() => switchTo("forgot")}>Reset password</button>}
                  {err.code === "invalid" && <button type="button" className="linkbtn" onClick={() => switchTo("forgot")}>Forgot password?</button>}
                </span>
              </div>
            )}
            <button className="btn block" disabled={busy}>
              {busy ? "Please wait..." : mode === "in" ? "Log in" : mode === "up" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <p className="center small">
            {mode === "in" && <>New to Fyndo? <button className="linkbtn" onClick={() => switchTo("up")}>Create an account</button></>}
            {mode === "up" && <>Already have an account? <button className="linkbtn" onClick={() => switchTo("in")}>Log in</button></>}
            {mode === "forgot" && <>Remembered it? <button className="linkbtn" onClick={() => switchTo("in")}>Back to log in</button></>}
          </p>
        </>
      )}
      <span className="sr-only"><Ico n="user" /></span>
    </div>
  );
}
