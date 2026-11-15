"use client";
import { useEffect } from "react";

// Registers the service worker so the site can be installed as an app.
export default function PWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const keep = (e) => { e.preventDefault(); window.__installPrompt = e; window.dispatchEvent(new Event("installable")); };
    window.addEventListener("beforeinstallprompt", keep);
    return () => window.removeEventListener("beforeinstallprompt", keep);
  }, []);
  return null;
}
