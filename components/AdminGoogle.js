"use client";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/data";
import { health, googleSearch } from "@/lib/api";
import { Ico } from "./Icon";

// ---------- Setup check: what is working, in plain words ----------
export function SetupCheck({ spots }) {
  const [h, setH] = useState(undefined); // undefined = checking, null = not reachable
  const [test, setTest] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { health().then(setH).catch(() => setH(null)); }, []);

  const linked = spots.filter((s) => s.google_place_id).length;
  const runTest = async () => {
    setBusy(true); setTest(null);
    try {
      const r = await googleSearch("Galle Face Green Colombo");
      setTest({ ok: true, text: r.results && r.results[0] ? `Google replied: ${r.results[0].name}` : "Google replied with no results." });
    } catch (e) { setTest({ ok: false, text: e.message }); }
    setBusy(false);
  };

  const Row = ({ ok, label, hint }) => (
    <div className="kv" style={{ alignItems: "flex-start" }}>
      <span><Ico n={ok ? "check" : "close"} size={16} style={{ color: ok ? "var(--green)" : "var(--chili)", marginRight: 8 }} />{label}</span>
      {!ok && hint && <span className="small muted" style={{ maxWidth: "55%", textAlign: "right" }}>{hint}</span>}
    </div>
  );

  return (
    <div className="card pad" style={{ marginBottom: 14 }}>
      <b>Setup check</b>
      {h === undefined && <div className="small muted" style={{ marginTop: 6 }}>Checking...</div>}
      {h === null && (
        <div className="alert" style={{ marginTop: 8 }}>
          The server functions did not answer. Google, AI and admin search all need them. In Azure open your Static Web App and check that the latest GitHub deploy
          finished and shows an API.
        </div>
      )}
      {h && (
        <div style={{ marginTop: 6 }}>
          <Row ok label="Server functions are running" />
          <Row ok={h.google} label="Google key is set in Azure" hint="Add GOOGLE_MAPS_API_KEY under Environment variables, then Apply." />
          <Row ok={h.supabase} label="Supabase is connected on the server" hint="Add SUPABASE_URL and SUPABASE_ANON_KEY under Environment variables." />
          <Row ok={Boolean(h.ai)} label={h.ai ? `AI for Ask Fyndo: ${h.ai === "gemini" ? "Gemini" : "Azure OpenAI"}` : "AI for Ask Fyndo"} hint="Optional. Add GEMINI_API_KEY (free). Without it Ask Fyndo uses simple keyword matching." />
          <Row ok={spots.length === 0 || linked > 0} label={`Places linked to Google: ${linked} of ${spots.length}`} hint="Google photos, ratings and hours only show on linked places. Use Link to Google below." />
          {h.google && (
            <div style={{ marginTop: 10 }}>
              <button className="btn sm ghost" onClick={runTest} disabled={busy}>{busy ? "Testing..." : "Test the Google key"}</button>
              {test && <div className={"alert" + (test.ok ? " ok" : "")} style={{ marginTop: 8 }}>{test.text}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Link places to Google in bulk, with a check before saving ----------
const norm = (s) => String(s || "").toLowerCase().replace(/\(sample\)/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1);
function similarity(a, b) {
  const A = new Set(norm(a)), B = new Set(norm(b));
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach((w) => B.has(w) && n++);
  return n / Math.max(A.size, B.size);
}

export function GoogleLinker({ spots, onDone }) {
  const todo = spots.filter((s) => !s.google_place_id);
  const [rows, setRows] = useState(null);
  const [state, setState] = useState("idle"); // idle | working | review | saving
  const [done, setDone] = useState(0);
  const [err, setErr] = useState("");
  const cancel = useRef(false);

  const start = async () => {
    const batch = todo.slice(0, 10);
    if (!batch.length) return;
    if (!window.confirm(`This will make ${batch.length} Google searches (one per place). Google gives a free monthly allowance, so a small batch is normally free. Continue?`)) return;
    cancel.current = false; setErr(""); setRows([]); setDone(0); setState("working");
    const out = [];
    for (const s of batch) {
      if (cancel.current) break;
      try {
        const q = `${String(s.name).replace(/\(sample\)/i, "").trim()} ${s.area}`;
        const r = (await googleSearch(q)).results || [];
        const top = r[0];
        const score = top ? similarity(s.name, top.name) : 0;
        out.push({ spot: s, hit: top || null, score, pick: Boolean(top) && score >= 0.5 });
      } catch (e) {
        setErr(e.message);
        out.push({ spot: s, hit: null, score: 0, pick: false });
        if (/not set up|key|403|permission|API|denied|log in|expired|Admins|limit|quota|not turned on|restricted/i.test(e.message)) break; // same error would repeat
      }
      setRows([...out]); setDone(out.length);
      await new Promise((r) => setTimeout(r, 350));
    }
    setState("review");
  };

  const toggle = (i) => setRows(rows.map((r, k) => (k === i ? { ...r, pick: !r.pick } : r)));
  const save = async () => {
    setState("saving"); setErr("");
    let n = 0;
    for (const r of rows.filter((x) => x.pick && x.hit)) {
      try { await db.updateSpot(r.spot.id, { google_place_id: r.hit.id }); n++; } catch (e) { setErr(e.message); }
    }
    setState("idle"); setRows(null);
    onDone(`Linked ${n} place${n === 1 ? "" : "s"} to Google.`);
  };

  if (!todo.length && state === "idle") return <div className="card pad small muted" style={{ marginBottom: 14 }}>Every place is already linked to Google.</div>;

  return (
    <div className="card pad" style={{ marginBottom: 14 }}>
      <b>Link places to Google</b>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>
        Finds the matching Google listing for each place that has none, so spot pages can show Google photos, ratings and opening hours.
        You check every match before it is saved. Made-up sample places will not match, which is fine.
      </p>
      {state === "idle" && <button className="btn sm" onClick={start}>Find matches for {Math.min(todo.length, 10)} place{Math.min(todo.length, 10) === 1 ? "" : "s"}</button>}
      {state === "working" && <div className="row"><span className="small">Searching Google ({done} of {Math.min(todo.length, 10)})...</span><button className="linkbtn" onClick={() => (cancel.current = true)}>Stop</button></div>}
      {err && <div className="alert" style={{ marginTop: 8 }}>{err}</div>}
      {rows && rows.length > 0 && (
        <div className="stack" style={{ marginTop: 10 }}>
          {rows.map((r, i) => (
            <label key={r.spot.id} className="card pad row" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start", opacity: r.hit ? 1 : 0.6 }}>
              <input type="checkbox" checked={r.pick} disabled={!r.hit || state !== "review"} onChange={() => toggle(i)} style={{ marginTop: 4, width: 18, height: 18 }} />
              <span style={{ minWidth: 0 }}>
                <b>{r.spot.name}</b> <span className="small muted">({r.spot.area})</span>
                {r.hit ? (
                  <span className="small" style={{ display: "block" }}>
                    Google: <b>{r.hit.name}</b>, {r.hit.address}{" "}
                    {r.hit.mapsUrl && <a className="linkbtn" href={r.hit.mapsUrl} target="_blank" rel="noreferrer">check on Google Maps</a>}
                    {r.score < 0.5 && <span style={{ display: "block", color: "var(--chili)" }}>Names look different. Only tick it if it is the same place.</span>}
                  </span>
                ) : <span className="small muted" style={{ display: "block" }}>No match found</span>}
              </span>
            </label>
          ))}
        </div>
      )}
      {state === "review" && rows && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn sm" onClick={save} disabled={!rows.some((r) => r.pick)}>Link {rows.filter((r) => r.pick).length} selected</button>
          <button className="btn sm ghost" onClick={() => { setRows(null); setState("idle"); }}>Cancel</button>
        </div>
      )}
      {state === "saving" && <div className="small muted" style={{ marginTop: 10 }}>Saving...</div>}
    </div>
  );
}
