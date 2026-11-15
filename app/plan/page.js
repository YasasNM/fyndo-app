"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/data";
import { useSpots, useUser, goLogin } from "@/lib/hooks";
import { VIBES, buildPlan } from "@/lib/planner";
import { AREAS } from "@/lib/seed";
import { Thumb } from "@/components/SpotCard";
import { lkr, niceTime, nextDays, shareNow, avgPrice } from "@/lib/utils";

const TIMES = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];

export default function PlanPage() {
  const { spots } = useSpots();
  const user = useUser();
  const days = nextDays(7);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ vibe: "", budget: 5000, area: "", date: days[0].iso, start: "17:30", veg: false });
  const [skip, setSkip] = useState({});
  const [msg, setMsg] = useState("");
  // Opened from Ask Fyndo with ?vibe=...: jump straight to the plan
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!VIBES.some((v) => v.id === p.get("vibe"))) return;
    setF((x) => ({ ...x, vibe: p.get("vibe"), budget: Number(p.get("budget")) || x.budget, area: p.get("area") || "",
      start: p.get("start") || x.start, date: days.some((d) => d.iso === p.get("date")) ? p.get("date") : x.date, veg: p.get("veg") === "1" }));
    setStep(4);
  }, []); // eslint-disable-line
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const plan = step === 4 && spots ? buildPlan(spots, { ...f, skip }) : null;
  const swap = (i) => {
    const cur = plan.stops[i].spot;
    if (!cur) return;
    setSkip((s) => ({ ...s, [i]: [...(s[i] || []), cur.id] }));
  };
  const dateLabel = (days.find((d) => d.iso === f.date) || days[0]).label;

  const shareText = () =>
    `Our Fyndo date plan for ${dateLabel} 💞\n` +
    plan.stops.filter((s) => s.spot).map((s) => `${niceTime(s.time)}  ${s.label}: ${s.spot.name} (${s.spot.area})`).join("\n") +
    `\nAbout ${lkr(plan.total)} for two.`;

  // A link that rebuilds this same plan for whoever opens it.
  const planLink = () => {
    const p = new URLSearchParams({ vibe: f.vibe, budget: String(f.budget), start: f.start, date: f.date });
    if (f.area) p.set("area", f.area);
    if (f.veg) p.set("veg", "1");
    return `${window.location.origin}/plan/?${p}`;
  };
  const share = async () => { await shareNow({ title: "Our Fyndo date plan", text: shareText(), url: planLink() }); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(planLink()); setMsg("Plan link copied. Send it to your date!"); }
    catch { setMsg("Could not copy the link."); }
  };

  const save = async () => {
    if (!user) return goLogin();
    try { await db.savePlan(`${plan.vibeLabel} · ${dateLabel}`, plan); setMsg("Plan saved. Find it in Saved."); }
    catch (e) { setMsg(e.message); }
  };

  const Next = ({ disabled }) => (
    <button className="btn block" disabled={disabled} onClick={() => setStep(step + 1)} style={{ marginTop: 16 }}>
      {step === 3 ? "Build my plan" : "Next"}
    </button>
  );

  return (
    <div className="narrow">
      {step < 4 && (
        <>
          <div className="row between" style={{ marginTop: 16 }}>
            {step > 0 ? <button className="linkbtn" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
            <span className="small muted">Step {step + 1} of 4</span>
          </div>
          <div className="progress"><div style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        </>
      )}

      {step === 0 && (
        <>
          <h1>What's the vibe?</h1>
          {VIBES.map((v) => (
            <button key={v.id} className={"opt" + (f.vibe === v.id ? " on" : "")} onClick={() => set("vibe", v.id)}>
              <span className="em">{v.emoji}</span>{v.label}
            </button>
          ))}
          <Next disabled={!f.vibe} />
        </>
      )}

      {step === 1 && (
        <>
          <h1>Budget for two</h1>
          <p className="muted">The total for both of you, for the whole night.</p>
          <div className="center" style={{ fontSize: 30, fontWeight: 700, color: "var(--mango-dark)", margin: "18px 0" }}>{lkr(f.budget)}</div>
          <input className="range" type="range" min="1000" max="20000" step="500" value={f.budget} onChange={(e) => set("budget", Number(e.target.value))} />
          <div className="row between small muted"><span>LKR 1,000</span><span>LKR 20,000</span></div>
          <Next />
        </>
      )}

      {step === 2 && (
        <>
          <h1>Where and when?</h1>
          <label className="field"><span>Area</span>
            <select className="input" value={f.area} onChange={(e) => set("area", e.target.value)}>
              <option value="">Anywhere in Colombo</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <div className="field"><span>Day</span>
            <div className="days">
              {days.map((d) => (
                <button key={d.iso} className={"day" + (f.date === d.iso ? " on" : "")} onClick={() => set("date", d.iso)}>
                  <span className="small">{d.day}</span><b>{d.num}</b>
                </button>
              ))}
            </div>
          </div>
          <label className="field"><span>Start time</span>
            <select className="input" value={f.start} onChange={(e) => set("start", e.target.value)}>
              {TIMES.map((t) => <option key={t} value={t}>{niceTime(t)}</option>)}
            </select>
          </label>
          <Next />
        </>
      )}

      {step === 3 && (
        <>
          <h1>Anything else?</h1>
          <button className={"opt" + (f.veg ? " on" : "")} onClick={() => set("veg", !f.veg)}>
            <span className="em">🥦</span>Vegetarian friendly places {f.veg ? "✓" : ""}
          </button>
          <p className="small muted">More options (no alcohol, wheelchair access, parking) are coming soon.</p>
          <Next />
        </>
      )}

      {step === 4 && !spots && <div className="loading">Building your plan...</div>}
      {plan && (
        <>
          <h1>Your date plan 💞</h1>
          <p className="muted" style={{ marginTop: 0 }}>{plan.vibeLabel} · {dateLabel} · {f.area || "Anywhere"}</p>
          <div className="timeline">
            {plan.stops.map((s, i) => (
              <div key={i} className="stop">
                <div className="small muted" style={{ marginBottom: 4 }}>{niceTime(s.time)} · {s.label}</div>
                {s.spot ? (
                  <div className="card">
                    <Thumb spot={s.spot} className="mini" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/spot?id=${s.spot.id}`}><h3>{s.spot.name}</h3></Link>
                      <div className="small muted">{s.spot.area} · about {avgPrice(s.spot) ? lkr(avgPrice(s.spot) * 2) : "free"} for two</div>
                      <div className="row" style={{ marginTop: 6, gap: 14 }}>
                        {s.alternatives > 0 && <button className="linkbtn" onClick={() => swap(i)}>↻ Swap</button>}
                        {s.spot.booking_enabled && (
                          <Link className="linkbtn" href={`/book?id=${s.spot.id}&date=${f.date}&time=${s.time}`}>📅 Book</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card pad small muted">No match for this stop. Try a bigger budget or "Anywhere".
                    {skip[i] && <> <button className="linkbtn" onClick={() => setSkip((x) => ({ ...x, [i]: [] }))}>Reset swaps</button></>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="total"><span>Estimated total for two</span><span>{lkr(plan.total)}</span></div>
          {plan.total > f.budget && <p className="small muted">A bit over your budget. Swap a stop to bring it down.</p>}
          {msg && <div className={"alert" + (/^(Plan saved|Plan link)/.test(msg) ? " ok" : "")}>{msg}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={share}>Share plan</button>
            <button className="btn ghost" onClick={copy}>🔗 Copy link</button>
            <button className="btn ghost" onClick={save}>Save plan</button>
            <button className="btn ghost" onClick={() => { setStep(0); setSkip({}); setMsg(""); }}>Start over</button>
          </div>
        </>
      )}
    </div>
  );
}
