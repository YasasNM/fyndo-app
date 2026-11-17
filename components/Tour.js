"use client";
import { useEffect, useState } from "react";
import { Ico } from "./Icon";

// A three-step first-visit walkthrough for the home page. It never blocks the page:
// each step points at a real control, and people can skip at any time. Shown once; replay with /?tour=1.
const STEPS = [
  { sel: ".ask", title: "Say what you feel like", body: "Type it the way you would tell a friend. Fyndo turns it into real places and a plan." },
  { sel: ".moodrow", title: "Or tap a mood", body: "One tap filters every place in Colombo. Tap it again to clear." },
  { sel: ".suggest-plan", title: "Let Fyndo plan the night", body: "Pick a vibe and a budget. You get stops, times, a route and the cost for two." },
];
const KEY = "fyndo_tour_v1";

export default function Tour() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "done"; } catch {}
    const replay = new URLSearchParams(window.location.search).get("tour") === "1";
    if (replay || !seen) {
      const t = setTimeout(() => setStep(0), 900);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (step < 0) return;
    const el = document.querySelector(STEPS[step].sel);
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
