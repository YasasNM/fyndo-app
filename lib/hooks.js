"use client";
import { useEffect, useState } from "react";
import { db } from "./data";

export function useUser() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  useEffect(() => {
    let on = true;
    const load = () => db.getUser().then((u) => on && setUser(u)).catch(() => on && setUser(null));
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

export function goLogin() {
  window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search);
}
