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

export function goLogin() {
  window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search);
}
