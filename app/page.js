"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import SpotCard from "@/components/SpotCard";
import AskFyndo from "@/components/AskFyndo";
import { useSpots } from "@/lib/hooks";
import { MOODS, CATEGORIES, AREAS } from "@/lib/seed";
import { avgPrice, isOpenAt } from "@/lib/utils";

const BUDGETS = [
  { id: "", label: "Any budget" },
  { id: "1000", label: "Under LKR 1,000 pp" },
  { id: "2500", label: "Under LKR 2,500 pp" },
  { id: "5000", label: "Under LKR 5,000 pp" },
];

export default function Home() {
  const { spots, error } = useSpots();
  const [q, setQ] = useState("");
  const [mood, setMood] = useState("");
  const [cat, setCat] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [bookable, setBookable] = useState(false);

  const filtered = useMemo(() => {
    if (!spots) return [];
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const words = q.toLowerCase().trim();
    return spots.filter((s) => {
      if (mood && !s.moods.includes(mood)) return false;
      if (cat && s.category !== cat) return false;
      if (area && s.area !== area) return false;
      if (budget && avgPrice(s) > Number(budget)) return false;
      if (openNow && !isOpenAt(s, t)) return false;
      if (bookable && !s.booking_enabled) return false;
      if (words) {
        const hay = [s.name, s.area, s.category, s.about, ...s.moods, ...(s.menu || []).map((m) => m.item)].join(" ").toLowerCase();
        if (!words.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [spots, q, mood, cat, area, budget, openNow, bookable]);

  const filtering = q || mood || cat || area || budget || openNow || bookable;
  const clear = () => { setQ(""); setMood(""); setCat(""); setArea(""); setBudget(""); setOpenNow(false); setBookable(false); };

  return (
    <>
      <h1>Find the real spots.</h1>
      <p className="muted" style={{ marginTop: 0 }}>Real videos, real prices, and a full date plan in one minute.</p>

      <AskFyndo spots={spots} />

      <div className="search" style={{ marginTop: 12 }}>
        <span className="ic">🔍</span>
        <input className="input" placeholder="Or search by name: kottu, rooftop, tea..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <h2 style={{ marginTop: 16 }}>What's the mood?</h2>
      <div className="chips">
        {MOODS.map((m) => (
          <button key={m} className={"chip" + (mood === m ? " on" : "")} onClick={() => setMood(mood === m ? "" : m)}>{m}</button>
        ))}
      </div>

      <div className="row" style={{ marginTop: 6 }}>
        <select className="input" style={{ width: "auto" }} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
          <option value="">All areas</option>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget">
          {BUDGETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Type">
          <option value="">All types</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className={"chip" + (openNow ? " on" : "")} onClick={() => setOpenNow(!openNow)}>Open now</button>
        <button className={"chip" + (bookable ? " on" : "")} onClick={() => setBookable(!bookable)}>Can book</button>
        {filtering && <button className="linkbtn" onClick={clear}>Clear all</button>}
      </div>

      {!filtering && (
        <div className="hero-plan">
          <div>
            <h2>💞 Plan a date in 60 seconds</h2>
            <p>Pick a vibe and a budget. We build the whole night: food, fun and dessert.</p>
          </div>
          <Link href="/plan" className="btn">Start planning</Link>
        </div>
      )}

      {error && <div className="alert">Could not load places: {error}</div>}
      {!spots && !error && <div className="loading">Loading spots...</div>}

      {spots && !filtering && (
        <>
          <h2>💎 Hidden gems</h2>
          <div className="grid">{spots.filter((s) => s.hidden_gem).map((s) => <SpotCard key={s.id} spot={s} />)}</div>
          <h2>All spots</h2>
        </>
      )}
      {spots && filtering && <h2>{filtered.length} {filtered.length === 1 ? "spot" : "spots"} found</h2>}
      {spots && (
        filtered.length ? <div className="grid">{filtered.map((s) => <SpotCard key={s.id} spot={s} />)}</div>
          : <div className="empty"><div className="big">🤷</div>No spots match. Try fewer filters.</div>
      )}
    </>
  );
}
