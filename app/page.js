"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import SpotCard, { SkeletonGrid } from "@/components/SpotCard";
import AskFyndo from "@/components/AskFyndo";
import { useSpots, useRatings, usePopular, useLocation } from "@/lib/hooks";
import { MOODS, CATEGORIES, AREAS } from "@/lib/seed";
import { avgPrice, isOpenAt, km } from "@/lib/utils";

const BUDGETS = [
  { id: "", label: "Any budget" },
  { id: "1000", label: "Under LKR 1,000 pp" },
  { id: "2500", label: "Under LKR 2,500 pp" },
  { id: "5000", label: "Under LKR 5,000 pp" },
];
const SORTS = [
  { id: "best", label: "Best match" },
  { id: "rating", label: "Top rated" },
  { id: "near", label: "Nearest to me" },
  { id: "cheap", label: "Price: low to high" },
  { id: "pricey", label: "Price: high to low" },
  { id: "az", label: "Name A to Z" },
];

export default function Home() {
  const { spots, error } = useSpots();
  const ratings = useRatings();
  const popularIds = usePopular();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [mood, setMood] = useState("");
  const [cat, setCat] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [bookable, setBookable] = useState(false);
  const [sort, setSort] = useState("best");

  const chooseSort = (v) => { setSort(v); if (v === "near" && !loc.pos) loc.ask(); };
  const dist = (s) => (loc.pos && s.lat != null && s.lng != null ? km(loc.pos, { lat: s.lat, lng: s.lng }) : null);

  const filtered = useMemo(() => {
    if (!spots) return [];
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const words = q.toLowerCase().trim();
    const list = spots.filter((s) => {
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
    const r = (s) => (ratings[s.id] ? ratings[s.id].avg : 0);
    const by = {
      rating: (a, b) => r(b) - r(a) || (ratings[b.id]?.count || 0) - (ratings[a.id]?.count || 0),
      near: (a, b) => (dist(a) ?? 1e9) - (dist(b) ?? 1e9),
      cheap: (a, b) => avgPrice(a) - avgPrice(b),
      pricey: (a, b) => avgPrice(b) - avgPrice(a),
      az: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return by ? [...list].sort(by) : list;
  }, [spots, ratings, q, mood, cat, area, budget, openNow, bookable, sort, loc.pos]); // eslint-disable-line

  const filtering = q || mood || cat || area || budget || openNow || bookable || sort !== "best";
  const clear = () => { setQ(""); setMood(""); setCat(""); setArea(""); setBudget(""); setOpenNow(false); setBookable(false); setSort("best"); };

  const popular = (spots && popularIds.map((id) => spots.find((s) => s.id === id)).filter(Boolean).slice(0, 6)) || [];
  const topRated = (spots || []).filter((s) => ratings[s.id] && ratings[s.id].count >= 1)
    .sort((a, b) => ratings[b.id].avg - ratings[a.id].avg || ratings[b.id].count - ratings[a.id].count).slice(0, 6);
  const card = (s) => <SpotCard key={s.id} spot={s} rating={ratings[s.id]} distanceKm={dist(s)} />;

  return (
    <>
      <h1>Find the real spots.</h1>
      <p className="muted" style={{ marginTop: 0 }}>Real videos, real prices, and a full date plan in one minute.</p>

      <AskFyndo spots={spots} />

      <div className="search" style={{ marginTop: 12 }}>
        <span className="ic">🔍</span>
        <input className="input" type="search" placeholder="Or search by name: kottu, rooftop, tea..." value={q} onChange={(e) => setQ(e.target.value)} />
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
        <select className="input" style={{ width: "auto" }} value={sort} onChange={(e) => chooseSort(e.target.value)} aria-label="Sort by">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.id === "best" ? "Sort: Best match" : s.label}</option>)}
        </select>
        <button className={"chip" + (openNow ? " on" : "")} onClick={() => setOpenNow(!openNow)}>Open now</button>
        <button className={"chip" + (bookable ? " on" : "")} onClick={() => setBookable(!bookable)}>Can book</button>
        {filtering && <button className="linkbtn" onClick={clear}>Clear all</button>}
      </div>
      {sort === "near" && loc.status === "asking" && <p className="small muted">Finding your location...</p>}
      {sort === "near" && loc.status === "denied" && (
        <div className="alert">Location is off. Allow location in your browser to sort by distance.</div>
      )}
      {sort === "near" && loc.pos && spots && spots.some((s) => s.lat == null) && (
        <p className="small muted">Spots without a map position are listed last.</p>
      )}

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
      {!spots && !error && <SkeletonGrid />}

      {spots && !filtering && (
        <>
          {popular.length > 0 && (<><h2>🔥 Popular right now</h2><div className="hscroll">{popular.map(card)}</div></>)}
          {topRated.length > 0 && (<><h2>⭐ Top rated by Fyndo users</h2><div className="hscroll">{topRated.map(card)}</div></>)}
          {spots.some((s) => s.hidden_gem) && (<><h2>💎 Hidden gems</h2><div className="grid">{spots.filter((s) => s.hidden_gem).map(card)}</div></>)}
          <h2>All spots</h2>
        </>
      )}
      {spots && filtering && <h2>{filtered.length} {filtered.length === 1 ? "spot" : "spots"} found</h2>}
      {spots && (
        filtered.length ? <div className="grid">{filtered.map(card)}</div>
          : (
            <div className="empty">
              <div className="big">🤷</div>
              {spots.length === 0 ? "No places added yet." : "No spots match. Try fewer filters."}
              {filtering && spots.length > 0 && <><br /><br /><button className="btn sm" onClick={clear}>Clear filters</button></>}
            </div>
          )
      )}
    </>
  );
}
