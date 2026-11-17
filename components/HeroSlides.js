"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ico } from "./Icon";
import { PHOTOS } from "@/lib/photoCredits";

// The home hero: a slow crossfade through calm, real photos (openly licensed, credited).
// Pauses on request and stays on the first photo for people who prefer less motion.
const SLIDES = ["restaurant-2", "mount-lavinia", "coffee-3", "dosa-2"];
const EVERY = 5500;

export default function HeroSlides({ className = "" }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const box = useRef(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(m.matches);
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.2 });
    box.current && io.observe(box.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (paused || still || !onScreen) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), EVERY);
    return () => clearInterval(t);
  }, [paused, still, onScreen]);
  const p = PHOTOS[SLIDES[i]];

  return (
    <figure ref={box} className={"photo heroslides " + className} aria-roledescription="slideshow" aria-label="Places to go in Sri Lanka">
      {SLIDES.map((slug, k) => (
        <img key={slug} src={`/img/${slug}-1280.jpg`} srcSet={`/img/${slug}-500.jpg 500w, /img/${slug}-1280.jpg 1280w`}
          sizes="(max-width: 760px) 100vw, 420px" alt={PHOTOS[slug] ? PHOTOS[slug].alt : ""} aria-hidden={k !== i}
          className={"heroslide" + (k === i ? " on" : "")} loading={k === 0 ? "eager" : "lazy"} fetchPriority={k === 0 ? "high" : undefined} />
      ))}
      {!still && (
        <button type="button" className="hv-btn" onClick={() => setPaused(!paused)} aria-label={paused ? "Play slideshow" : "Pause slideshow"}>
          <Ico n={paused ? "play" : "pause"} size={18} />
        </button>
      )}
      {p && <figcaption className="photocredit"><Link href="/credits">Photo: {p.author.split(" (")[0]}, {p.license}</Link></figcaption>}
    </figure>
  );
}
