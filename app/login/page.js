"use client";
import { useState } from "react";
import { db, isLive } from "@/lib/data";
import { PlayPin } from "@/components/Logo";

export default function Login() {
  const [mode, setMode] = useState("in");
  const [f, setF] = useState({ email: "", password: "", name: "", phone: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const go = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") ? next : "/";
  };
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "in") await db.signIn(f.email, f.password);
      else {
        if (!f.name.trim()) throw new Error("Please add your name.");
        if (isLive && f.password.length < 6) throw new Error("Password needs at least 6 characters.");
        await db.signUp(f.email, f.password, f.name.trim(), f.phone.trim());
      }
      go();
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const demoLogin = async (email) => { await db.signIn(email, "demo"); go(); };

  return (
    <div className="narrow" style={{ maxWidth: 420 }}>
      <div className="center" style={{ marginTop: 26 }}><PlayPin size={44} /></div>
      <h1 className="center">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
      <p className="center muted" style={{ marginTop: 0 }}>Save spots, plan dates and book tables.</p>

      {!isLive && (
        <div className="card pad" style={{ margin: "16px 0", background: "var(--cream)" }}>
          <b>Demo logins (one tap)</b>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => demoLogin("user@demo.lk")}>User</button>
            <button className="btn sm dark" onClick={() => demoLogin("owner@demo.lk")}>Restaurant owner</button>
            <button className="btn sm dark" onClick={() => demoLogin("admin@demo.lk")}>Admin</button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card pad">
        {mode === "up" && (
          <>
            <label className="field"><span>Name</span><input className="input" value={f.name} onChange={set("name")} /></label>
            <label className="field"><span>Phone (for bookings)</span><input className="input" value={f.phone} onChange={set("phone")} placeholder="077 123 4567" /></label>
          </>
        )}
        <label className="field"><span>Email</span><input className="input" type="email" required value={f.email} onChange={set("email")} /></label>
        <label className="field"><span>Password</span><input className="input" type="password" required={isLive} value={f.password} onChange={set("password")} /></label>
        {err && <div className="alert">{err}</div>}
        <button className="btn block" disabled={busy}>{busy ? "Please wait..." : mode === "in" ? "Log in" : "Sign up"}</button>
      </form>
      <p className="center small">
        {mode === "in" ? "New to Fyndo? " : "Already have an account? "}
        <button className="linkbtn" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>
          {mode === "in" ? "Create an account" : "Log in"}
        </button>
      </p>
    </div>
  );
}
