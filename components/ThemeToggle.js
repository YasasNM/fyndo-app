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

// Header button: one tap flips between light and dark.
export default function ThemeToggle() {
  const { theme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="themebtn" onClick={() => setThemePref(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Ico n={theme === "dark" ? "sun" : "moon"} size={19} strokeWidth={1.9} />
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
          <button key={id} type="button" role="radio" aria-checked={pref === id} className={pref === id ? "on" : ""} onClick={() => setThemePref(id)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
