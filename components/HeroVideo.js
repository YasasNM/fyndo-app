"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ico } from "./Icon";

// The one moving moment on Home: a short muted loop of kottu being made at a roadside stall.
// It only plays when on screen, never for people who ask for reduced motion, and always has a pause button.
export default function HeroVideo({ className = "" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduce || userPaused) { v.pause(); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduce, userPaused]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { setUserPaused(false); v.play().catch(() => {}); } else { setUserPaused(true); v.pause(); }
  };

  return (
    <figure className={"photo herovideo " + className} style={{ "--ratio": 16 / 9 }}>
      <video ref={ref} muted loop playsInline preload="metadata" poster="/video/kottu-loop.jpg"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        aria-label="Kottu roti being chopped and tossed in a wok at a roadside stall">
        <source src="/video/kottu-loop.webm" type="video/webm" />
      </video>
      <button type="button" className="hv-btn" onClick={toggle} aria-label={playing ? "Pause video" : "Play video"}>
        <Ico n={playing ? "pause" : "play"} size={16} strokeWidth={2.2} />
      </button>
      <figcaption className="photocredit"><Link href="/credits">Video: Nahid Sultan, CC BY 3.0</Link></figcaption>
    </figure>
  );
}
