"use client";
import { useEffect, useState } from "react";
import { Ico } from "./Icon";
import { applyTheme, setThemePref, themePref } from "@/lib/theme";

function useTheme() {
  const [state, setState] = useState({ pref: "system", theme: "light" });
  useEffect(() => {
    const read = () => setState({ pref: themePref(), theme: document.documentElement.dataset.theme || "light" });
    read();
    const onTheme = () => read();
    // Following the phone: switch live when the phone's setting changes.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => { if (themePref() === "system") applyTheme("system"); };
    window.addEventListener("fyndo-theme", onTheme);
    window.addEventListener("storage", onSystem);
    mq.addEventListener ? mq.addEventListener("change", onSystem) : mq.addListener(onSystem);
    return () => {
      window.removeEventListener("fyndo-theme", onTheme);
      window.removeEventListener("storage", onSystem);
      mq.removeEventListener ? mq.removeEventListener("change", onSystem) : mq.removeListener(onSystem);
    };
  }, []);
  return state;
}

// Switch theme with the new colours growing out of the tapped button as a circle.
// Falls back to an instant switch where View Transitions are missing or motion is reduced.
export function switchTheme(pref, from) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce || !from) return setThemePref(pref);
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;
  root.classList.add("theme-vt");
  const t = document.startViewTransition(() => setThemePref(pref));
  t.ready.then(() => root.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
    { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
  )).catch(() => {});
  t.finished.finally(() => root.classList.remove("theme-vt"));
}

// Header button: one tap flips between light and dark.
export default function ThemeToggle() {
  const { theme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="themebtn" onClick={(e) => switchTheme(next, e.currentTarget)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Ico key={theme} className="themeic" n={theme === "dark" ? "sun" : "moon"} size={19} strokeWidth={1.6} duo />
    </button>
  );
}

// Settings row on the Me page: System, Light or Dark.
export function AppearancePicker() {
  const { pref } = useTheme();
  const opts = [["system", "Same as phone"], ["light", "Light"], ["dark", "Dark"]];
  return (
    <div className="card pad appearance">
      <div>
        <b>Appearance</b>
        <div className="small muted">Light, dark, or follow your phone's setting.</div>
      </div>
      <div className="seg" role="radiogroup" aria-label="Appearance">
        {opts.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={pref === id} className={pref === id ? "on" : ""} onClick={(e) => switchTheme(id, e.currentTarget)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
