"use client";
import { useEffect, useState } from "react";
import { db } from "./data";

export function useUser() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  useEffect(() => {
    let on = true;
    let request = 0;
    const load = () => {
      const current = ++request;
      setUser(undefined); // Lock access until the latest session lookup validates.
      db.getUser().then((u) => on && current === request && setUser(u))
        .catch(() => on && current === request && setUser(null));
    };
    load();
    const off = db.onAuthChange(load);
    return () => { on = false; off && off(); };
  }, []);
  return user;
}

export function useSpots() {
  const [spots, setSpots] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { db.getSpots().then(setSpots).catch((e) => setError(e.message)); }, []);
  return { spots, error };
}

// { spotId: { avg, count } } from Fyndo's own reviews
export function useRatings() {
  const [ratings, setRatings] = useState({});
  useEffect(() => { db.getRatings().then(setRatings).catch(() => {}); }, []);
  return ratings;
}

// Ids of the most saved spots
export function usePopular() {
  const [ids, setIds] = useState([]);
  useEffect(() => { db.getPopular().then(setIds).catch(() => {}); }, []);
  return ids;
}

// Curated lists made by the Fyndo team
export function useCollections() {
  const [list, setList] = useState([]);
  useEffect(() => { db.getCollections().then((l) => setList(l.filter((c) => c.published !== false))).catch(() => {}); }, []);
  return list;
}

// Phone location (asks permission only when called). Returns { pos, ask, status }.
export function useLocation() {
  const [pos, setPos] = useState(null);
  const [status, setStatus] = useState(""); // "", "asking", "denied", "ok"
  const ask = () => {
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setStatus("ok"); },
      () => setStatus("denied"), { timeout: 8000, maximumAge: 300000 });
  };
  return { pos, ask, status };
}

// Saved places for the logged-in person, with an optimistic toggle for the bookmark on cards.
export function useSaves(user) {
  const [ids, setIds] = useState([]);
  useEffect(() => { if (user) db.getSaves().then(setIds).catch(() => {}); else setIds([]); }, [user]);
  const toggle = async (id) => {
    if (!user) return goLogin();
    setIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
    try { const on = await db.toggleSave(id); setIds((l) => (on ? [...new Set([...l, id])] : l.filter((x) => x !== id))); }
    catch { setIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])); }
  };
  return { ids, toggle };
}

export function goLogin() {
  window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search);
}
