"use client";
import { useState } from "react";
import { db } from "@/lib/data";
import { discoverPlaces } from "@/lib/api";
import { slug } from "@/lib/utils";

// Finds popular food and drink places on Google for each area and adds them as Fyndo spots, linked to Google.
const AREAS = ["Colombo 3", "Colombo 4", "Colombo 5", "Colombo 7", "Dehiwala", "Mount Lavinia"];
const CHAINS = /mcdonald|kfc|pizza hut|domino|subway|burger king|starbucks|dunkin|taco bell|baskin|hardee|papa john/i;
const COLORS = { Restaurant: "#B6452C", "Café": "#7A5230", "Street Food": "#C77A12", Dessert: "#B03A6F" };

function categoryOf(type) {
  if (/cafe|coffee|tea_house/.test(type)) return "Café";
  if (/ice_cream|dessert|bakery|confection|donut|juice/.test(type)) return "Dessert";
  if (/fast_food|food_court|sandwich|snack/.test(type)) return "Street Food";
  return "Restaurant";
}
const MOODS = { Restaurant: ["With friends", "Family"], "Café": ["Cozy café"], "Street Food": ["Street food", "Budget"], Dessert: ["With friends", "Family"] };

export default function AdminDiscover({ spots, onDone }) {
  const [areas, setAreas] = useState(AREAS);
  const [skipChains, setSkipChains] = useState(true);
  const [rows, setRows] = useState(null);
  const [state, setState] = useState("idle"); // idle | searching | review | adding
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const haveIds = new Set(spots.map((s) => s.google_place_id).filter(Boolean));
  const haveNames = new Set(spots.map((s) => s.name.toLowerCase()));
  const toggleArea = (a) => setAreas(areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a]);

  const find = async () => {
    if (!areas.length) return;
    if (!window.confirm(`This makes ${areas.length} Google search${areas.length > 1 ? "es" : ""} (one per area, up to 20 places each). Small numbers stay inside Google's free monthly allowance. Continue?`)) return;
    setState("searching"); setErr(""); setMsg(""); setRows([]);
    const seen = new Set(); const out = [];
    for (const a of areas) {
      try {
        const { results } = await discoverPlaces(a);
        for (const r of results || []) {
          if (!r.name || seen.has(r.id)) continue;
          seen.add(r.id);
          const dup = haveIds.has(r.id) || haveNames.has(r.name.toLowerCase());
          const chain = CHAINS.test(r.name);
          out.push({ ...r, area: a, category: categoryOf(r.type), dup, chain, pick: !dup && !(chain && skipChains) });
        }
        setRows([...out]);
      } catch (e) { setErr(e.message); break; }
    }
    setState("review");
  };

  const toggle = (id) => setRows(rows.map((r) => (r.id === id ? { ...r, pick: !r.pick } : r)));
  const picked = (rows || []).filter((r) => r.pick);

  const add = async () => {
    setState("adding"); setErr("");
    const used = new Set(spots.map((s) => s.id));
    let ok = 0;
    for (const r of picked) {
      let id = slug(r.name) || "place"; let n = 2;
      while (used.has(id)) id = `${slug(r.name)}-${n++}`;
      used.add(id);
      try {
        await db.createSpot({
          id, name: r.name, area: r.area, category: r.category, price_min: 0, price_max: 0, moods: MOODS[r.category], about: "",
          video_url: "", google_place_id: r.id, menu: [], open_time: r.category === "Café" ? "08:00" : "11:00", close_time: "22:00",
          lat: r.lat, lng: r.lng, phone: "", whatsapp: "", color: COLORS[r.category], verified: false, hidden_gem: false, features: [],
        });
        ok++; setMsg(`Adding... ${ok} of ${picked.length}`);
      } catch (e) { setErr(`${r.name}: ${e.message}`); }
    }
    setState("idle"); setRows(null); setMsg(`Added ${ok} place${ok === 1 ? "" : "s"} from Google. Their photos, rating, hours and phone load live from Google on each place page.`);
    onDone();
  };

  return (
    <div className="card pad" style={{ marginBottom: 14 }}>
      <b>Add places from Google</b>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>
        Finds the most popular restaurants, cafés and dessert places in each area using Google Places, and adds them linked to their Google listing.
        Add your own prices, menus and moods later. Nothing is marked Verified.
      </p>
      <div className="row" style={{ gap: 6 }}>
        {AREAS.map((a) => <button key={a} type="button" className={"chip" + (areas.includes(a) ? " on" : "")} aria-pressed={areas.includes(a)} onClick={() => toggleArea(a)} disabled={state !== "idle"}>{a}</button>)}
      </div>
      <label className="row small" style={{ marginTop: 8 }}><input type="checkbox" checked={skipChains} onChange={(e) => setSkipChains(e.target.checked)} /> Leave out global chains (KFC, Pizza Hut...)</label>
      {state === "idle" && <button className="btn sm" style={{ marginTop: 10 }} onClick={find} disabled={!areas.length}>Find places in {areas.length} area{areas.length === 1 ? "" : "s"}</button>}
      {state === "searching" && <div className="small" style={{ marginTop: 10 }}>Searching Google... {(rows || []).length} found so far</div>}
      {err && <div className="alert" style={{ marginTop: 10 }}>{err}</div>}
      {msg && <div className={"alert" + (/^Added/.test(msg) ? " ok" : "")} style={{ marginTop: 10 }}>{msg}</div>}

      {rows && rows.length > 0 && state !== "adding" && (
        <>
          <div className="row between" style={{ marginTop: 12 }}>
            <span className="small"><b>{picked.length}</b> of {rows.length} selected</span>
            <span className="row" style={{ gap: 12 }}>
              <button className="linkbtn" onClick={() => setRows(rows.map((r) => ({ ...r, pick: !r.dup })))}>Select all new</button>
              <button className="linkbtn" onClick={() => setRows(rows.map((r) => ({ ...r, pick: false })))}>Select none</button>
            </span>
          </div>
          <div className="stack" style={{ marginTop: 8, maxHeight: 420, overflowY: "auto" }}>
            {rows.map((r) => (
              <label key={r.id} className="card pad row" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start", opacity: r.dup ? 0.55 : 1 }}>
                <input type="checkbox" checked={r.pick} disabled={r.dup} onChange={() => toggle(r.id)} style={{ marginTop: 4, width: 18, height: 18 }} />
                <span style={{ minWidth: 0 }}>
                  <b>{r.name}</b> <span className="tag">{r.category}</span> {r.dup && <span className="badge grey">Already added</span>} {r.chain && <span className="badge grey">Chain</span>}
                  <span className="small muted" style={{ display: "block" }}>{r.area}{r.typeLabel ? `, ${r.typeLabel}` : ""}. {r.address}</span>
                  {r.mapsUrl && <a className="linkbtn small" href={r.mapsUrl} target="_blank" rel="noreferrer">See on Google Maps</a>}
                </span>
              </label>
            ))}
          </div>
          {state === "review" && (
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={add} disabled={!picked.length}>Add {picked.length} place{picked.length === 1 ? "" : "s"}</button>
              <button className="btn sm ghost" onClick={() => { setRows(null); setState("idle"); }}>Cancel</button>
            </div>
          )}
        </>
      )}
      {rows && rows.length === 0 && state === "review" && !err && <div className="small muted" style={{ marginTop: 10 }}>Google returned no places for those areas.</div>}
    </div>
  );
}
