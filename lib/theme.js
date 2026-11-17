// Light, dark or follow the phone. The choice is kept in this browser only.
// The tiny script in app/layout.js applies it before the first paint so the page never flashes.
export const THEME_KEY = "fyndo-theme";
const BAR = { light: "#ffffff", dark: "#0f1513" };

export function themePref() {
  try { const p = localStorage.getItem(THEME_KEY); return p === "light" || p === "dark" ? p : "system"; } catch { return "system"; }
}

export function resolvedTheme(pref = themePref()) {
  if (pref === "light" || pref === "dark") return pref;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref = themePref()) {
  const t = resolvedTheme(pref);
  const el = document.documentElement;
  el.dataset.theme = t;
  el.dataset.themePref = pref;
  el.style.colorScheme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", BAR[t]));
  window.dispatchEvent(new CustomEvent("fyndo-theme", { detail: { pref, theme: t } }));
}

export function setThemePref(pref) {
  try { if (pref === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, pref); } catch {}
  applyTheme(pref);
}

// Runs before React, inline in <head>. Keep it small and dependency-free.
export const THEME_BOOT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');}catch(e){}var d=p==='dark'||(p!=='light'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.dataset.themePref=p==='dark'||p==='light'?p:'system';r.style.colorScheme=d?'dark':'light';try{if(sessionStorage.getItem('fyndo-intro'))r.dataset.intro='seen';}catch(e){}})()`;
