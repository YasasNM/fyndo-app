"use client";
import { Ico } from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { db } from "@/lib/data";
import { useSpots, useUser, useRatings, goLogin } from "@/lib/hooks";
import { VIBES, buildPlan, shortlists } from "@/lib/planner";
import { planAi } from "@/lib/api";
import { downloadIcs, atDateTime } from "@/lib/ics";
import { useSunsets } from "@/lib/sun";
import { AREAS } from "@/lib/seed";
import { Thumb } from "@/components/SpotCard";
import { lkr, niceTime, nextDays, shareNow, avgPrice, whyThis, areaOptions } from "@/lib/utils";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false, loading: () => <div className="skel" style={{ height: 260, borderRadius: 16, marginTop: 14 }} /> });
const VIBE_ICON = { romantic: "heart", fun: "group", outdoor: "sun", chill: "cup" };
const TIMES = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];

export default function PlanPage() {
  const { spots } = useSpots();
  const user = useUser();
  const ratings = useRatings();
  const days = nextDays(7);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ vibe: "", budget: 5000, area: "", date: days[0].iso, start: "17:30", veg: false });
  const [skip, setSkip] = useState({});
  const [msg, setMsg] = useState("");
  const sunsets = useSunsets();
  // Opened from Ask Fyndo with ?vibe=...: jump straight to the plan
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!VIBES.some((v) => v.id === p.get("vibe"))) return;
    setF((x) => ({ ...x, vibe: p.get("vibe"), budget: Number(p.get("budget")) || x.budget, area: p.get("area") || "",
      start: p.get("start") || x.start, date: days.some((d) => d.iso === p.get("date")) ? p.get("date") : x.date, veg: p.get("veg") === "1" }));
    setStep(4);
  }, []); // eslint-disable-line
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const rulePlan = step === 4 && spots ? buildPlan(spots, { ...f, skip }) : null;
  // AI fine-tuning: the rules' plan shows at once; a free AI then re-chooses among the same rule-approved
  // places for each stop and explains why. If no AI answers, the rules' plan simply stays.
  const [ai, setAi] = useState({ key: "", state: "idle", picks: {}, tip: "" });
  const aiKey = JSON.stringify({ v: f.vibe, b: f.budget, a: f.area, d: f.date, s: f.start, veg: f.veg, n: f.note || "" });
  useEffect(() => {
    if (!rulePlan || ai.key === aiKey) return;
    setAi({ key: aiKey, state: "busy", picks: {}, tip: "" });
    // Stops the rules found no place for are left out; the AI tunes the rest (at least two).
    const lists = shortlists(spots, { ...f, skip }, rulePlan, ratings).map((l, i) => ({ ...l, i })).filter((l) => l.candidates.length);
    if (lists.length < 2) { setAi((x) => ({ ...x, state: "off" })); return; }
    planAi({ vibe: rulePlan.vibeLabel, budget: f.budget, start: f.start, area: f.area, veg: f.veg, note: f.note || "",
      stops: lists.map(({ label, candidates }) => ({ label, candidates })) })
      .then((r) => setAi((x) => (x.key !== aiKey ? x : { ...x, state: "done", tip: r.tip || "",
        picks: Object.fromEntries((r.picks || []).filter((p) => lists[p.stop]).map((p) => [lists[p.stop].i, { id: p.id, why: p.why }])) })))
      .catch(() => setAi((x) => (x.key !== aiKey ? x : { ...x, state: "off" })));
  }, [rulePlan && aiKey, spots]); // eslint-disable-line

  // The plan shown: the rules' plan with the AI's choices swapped in.
  const plan = rulePlan && (() => {
    const stops = rulePlan.stops.map((s, i) => {
      const p = ai.key === aiKey && ai.picks[i];
      const spot = p && !(skip[i] || []).includes(p.id) && spots.find((x) => x.id === p.id);
      return spot ? { ...s, spot, ai: p.why } : s;
    });
    return { ...rulePlan, stops, total: stops.reduce((a, s) => a + (s.spot ? avgPrice(s.spot) * 2 : 0), 0) };
  })();
  const swap = (i) => {
    const cur = plan.stops[i].spot;
    if (!cur) return;
    setSkip((s) => ({ ...s, [i]: [...(s[i] || []), cur.id] }));
    setAi((x) => { const picks = { ...x.picks }; delete picks[i]; return { ...x, picks }; });
  };
  const dateLabel = (days.find((d) => d.iso === f.date) || days[0]).label;

  const shareText = () =>
    `Our Fyndo date plan for ${dateLabel}\n` +
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

  const addToCalendar = () => {
    const events = plan.stops.filter((x) => x.spot).map((x) => ({
      title: `${x.label}: ${x.spot.name}`, start: atDateTime(f.date, x.time), minutes: 75,
      location: `${x.spot.name}, ${x.spot.area}`, notes: "Planned with Fyndo",
    }));
    if (events.length) downloadIcs("fyndo-date-plan.ics", events);
  };
  const vibeMoods = (VIBES.find((v) => v.id === f.vibe) || { moods: [] }).moods;

  const save = async () => {
    if (!user) return goLogin();
    try { await db.savePlan(`${plan.vibeLabel}, ${dateLabel}`, plan); setMsg("Plan saved. Find it in Saved."); }
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
            {step > 0 ? <button className="linkbtn" onClick={() => setStep(step - 1)}>Back</button> : <span />}
            <span className="small muted">Step {step + 1} of 4</span>
          </div>
          <div className="progress"><div style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
        </>
      )}

      {step === 0 && (
        <>
          <figure className="photo planphoto"><img src="/img/plan-evening-1600.jpg" srcSet="/img/plan-evening-800.jpg 800w, /img/plan-evening-1600.jpg 1600w" sizes="(max-width: 760px) 100vw, 560px" alt="A couple walking hand in hand above the Colombo seafront at dusk, with a lit rooftop restaurant and city lights ahead" fetchPriority="high" /></figure>
          <h1>What's the vibe?</h1>
          {VIBES.map((v) => (
            <button key={v.id} className={"opt" + (f.vibe === v.id ? " on" : "")} onClick={() => set("vibe", v.id)}>
              <span className="em"><Ico n={VIBE_ICON[v.id] || "heart"} size={20} /></span>{v.label}
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
              {areaOptions(AREAS, spots).map((a) => <option key={a}>{a}</option>)}
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
            <span className="em"><Ico n="leaf" size={20} /></span>Vegetarian friendly places{f.veg ? " (on)" : ""}
          </button>
          <label className="field" style={{ marginTop: 6 }}><span>Anything we should know? (optional)</span>
            <textarea className="input" rows={2} maxLength={200} value={f.note || ""} onChange={(e) => set("note", e.target.value)}
              placeholder="e.g. she loves seafood, no spicy food, somewhere with parking" />
            <span className="small muted fieldhint">Fyndo's AI uses this to choose between the places that fit your plan.</span>
          </label>
          <Next />
        </>
      )}

      {step === 4 && !spots && <div className="loading">Building your plan...</div>}
      {plan && (
        <>
          <h1>Your date plan</h1>
          <p className="muted" style={{ marginTop: 0 }}>{plan.vibeLabel} on {dateLabel}, {f.area || "anywhere in Colombo"}</p>
          {sunsets[f.date] && (
            <p className="small" style={{ marginTop: -4 }}><Ico n="sun" size={16} /> Sunset that day is at {niceTime(sunsets[f.date])}.{f.vibe === "outdoor" ? " Aim to reach your first stop 30 minutes before." : ""}</p>
          )}
          <p className="small aistatus" aria-live="polite">
            {ai.key === aiKey && ai.state === "busy" && <><span className="aidot" aria-hidden="true" />Fine-tuning your plan with AI...</>}
            {ai.key === aiKey && ai.state === "done" && Object.keys(ai.picks).length > 0 && <><Ico n="star" size={15} />Tuned by AI for your budget{f.note ? " and wishes" : ""}. Every place still comes from Fyndo's list.</>}
          </p>
          <div className="timeline">
            {plan.stops.map((s, i) => (
              <div key={i} className="stop">
                <div className="small muted" style={{ marginBottom: 4 }}><b>{niceTime(s.time)}</b> {s.label}{s.ai && <span className="aipick">AI pick</span>}</div>
                {s.spot ? (
                  <div className="card">
                    <Thumb spot={s.spot} className="mini" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/spot?id=${s.spot.id}`}><h3>{s.spot.name}</h3></Link>
                      <div className="small muted">{s.spot.area}, about {avgPrice(s.spot) ? lkr(avgPrice(s.spot) * 2) : "free"} for two</div>
                      <div className="small why">{s.ai || whyThis(s.spot, { moods: vibeMoods, budget: f.budget, area: f.area })}</div>
                      <div className="row" style={{ marginTop: 6, gap: 14 }}>
                        {s.alternatives > 0 && <button className="linkbtn" onClick={() => swap(i)}>Swap this stop</button>}
                        {s.spot.booking_enabled && (
                          <Link className="linkbtn" href={`/book?id=${s.spot.id}&date=${f.date}&time=${s.time}`}>Book a table</Link>
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
          {(() => {
            const mapStops = plan.stops.filter((x) => x.spot && x.spot.lat != null && x.spot.lng != null).map((x) => x.spot);
            return mapStops.length >= 2 ? <RouteMap stops={mapStops} /> : null;
          })()}
          <div className="total" style={{ marginTop: 14 }}><span>Estimated total for two</span><span>{lkr(plan.total)}</span></div>
          {plan.total > f.budget && <p className="small muted">A bit over your budget. Swap a stop to bring it down.</p>}
          {ai.key === aiKey && ai.tip && <p className="small aitip"><b>Tip:</b> {ai.tip}</p>}
          {msg && <div className={"alert" + (/^(Plan saved|Plan link)/.test(msg) ? " ok" : "")}>{msg}</div>}
          <div className="actionbar">
            <button className="btn" onClick={share}><Ico n="share" size={18} />Share plan</button>
            <button className="btn ghost" onClick={save}><Ico n="bookmark" size={18} />Save plan</button>
          </div>
          <div className="row small" style={{ gap: 16, marginTop: -6 }}>
            <button className="linkbtn" onClick={copy}>Copy link</button>
            <button className="linkbtn" onClick={addToCalendar}>Add to calendar</button>
            <Link className="linkbtn" href="/split">Split the bill</Link>
            <button className="linkbtn" onClick={() => { setStep(0); setSkip({}); setMsg(""); setAi({ key: "", state: "idle", picks: {}, tip: "" }); }}>Start over</button>
          </div>
        </>
      )}
    </div>
  );
}
