"use client";
import { useEffect, useState } from "react";
import { Ico } from "./Icon";

// Optional help, opened by Help or /?tour=1. Never interrupt a first visit.
const STEPS = [
  { sel: ".directory-search", title: "Find a local place", body: "Search by a name, dish or area. Use the controls below to narrow the list." },
  { sel: ".directory-toggles", title: "Choose what matters", body: "Filter by area, type, budget and opening hours. More filters has moods, occasions and facilities." },
  { sel: ".toplinks a[href='/plan'], .tabs a[href='/plan']", title: "Plan an outing", body: "The Plan tool combines places into stops, times and a route. Check the listed prices and hours before you go." },
];
const KEY = "fyndo_tour_v1";

export default function Tour({ replayRequest = 0 }) {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (replayRequest > 0) {
      setStep(0);
      return;
    }
    const replay = new URLSearchParams(window.location.search).get("tour") === "1";
    if (replay) {
      const t = setTimeout(() => setStep(0), 900);
      return () => clearTimeout(t);
    }
  }, [replayRequest]);

  useEffect(() => {
    if (step < 0) return;
    // First match that is actually on screen (the top bar on desktop, the bottom bar on phones).
    const el = [...document.querySelectorAll(STEPS[step].sel)].find((x) => x.offsetParent !== null || getComputedStyle(x).position === "fixed");
    if (!el) return;
    el.classList.add("tour-hi");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => el.classList.remove("tour-hi");
  }, [step]);

  const finish = () => { try { localStorage.setItem(KEY, "done"); } catch {} setStep(-1); };
  if (step < 0) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="tour" role="dialog" aria-label="Quick tour" aria-live="polite">
      <div className="tour-top">
        <span className="small muted">{step + 1} of {STEPS.length}</span>
        <button type="button" className="linkbtn" onClick={finish}>Skip tour</button>
      </div>
      <b>{s.title}</b>
      <p style={{ margin: "4px 0 10px" }}>{s.body}</p>
      <div className="row">
        <button type="button" className="btn sm" onClick={() => (last ? finish() : setStep(step + 1))}>{last ? "Got it" : "Next"}<Ico n="arrow" size={16} /></button>
        {step > 0 && <button type="button" className="btn sm ghost" onClick={() => setStep(step - 1)}>Back</button>}
      </div>
    </div>
  );
}
