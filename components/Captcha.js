"use client";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile bot check for log in, sign up and password reset (free).
// Off until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set at build time; then turn on CAPTCHA in
// Supabase > Authentication > Attack Protection with the matching secret key.
export const CAPTCHA_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();

let loading = null;
function loadScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => { loading = null; reject(new Error("The bot check could not load. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Each token works once: remount (change the key prop) after every attempt to get a fresh one.
export default function Captcha({ onToken, onError }) {
  const box = useRef(null);
  useEffect(() => {
    if (!CAPTCHA_KEY) return;
    let id = null, gone = false;
    loadScript().then((ts) => {
      if (gone || !box.current || !ts) return;
      id = ts.render(box.current, {
        sitekey: CAPTCHA_KEY,
        theme: "auto",
        size: "flexible",
        callback: (t) => onToken(t),
        "expired-callback": () => onToken(""),
        "error-callback": () => { onToken(""); onError && onError("The bot check failed. Reload the page and try again."); },
      });
    }).catch((e) => onError && onError(e.message));
    return () => { gone = true; try { if (id !== null && window.turnstile) window.turnstile.remove(id); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!CAPTCHA_KEY) return null;
  return <div ref={box} className="captcha" aria-label="Bot check" />;
}
