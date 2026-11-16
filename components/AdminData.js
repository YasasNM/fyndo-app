"use client";
import { useState } from "react";
import { db } from "@/lib/data";

// Starter data for admins: add the bundled real places, or remove the made-up samples.
export default function StarterData({ spots, onDone }) {
  const [busy, setBusy] = useState("");
  const [log, setLog] = useState("");
  const samples = spots.filter((s) => /\(sample\)/i.test(s.name));
  const have = new Set(spots.map((s) => s.id));

  const importReal = async () => {
    const { default: list } = await import("@/lib/realPlaces.json");
    const todo = list.filter((p) => !have.has(p.id));
    if (!todo.length) return setLog("All bundled places are already added.");
    if (!window.confirm(`Add ${todo.length} real places from OpenStreetMap? They have no prices or menus yet and are not marked Verified. You can edit or delete any of them later.`)) return;
    setBusy("import"); setLog("");
    let ok = 0, fail = "";
    for (const p of todo) {
      try { await db.createSpot(p); ok++; setLog(`Adding... ${ok} of ${todo.length}`); }
      catch (e) { fail = e.message; if (/features|column/i.test(fail)) break; }
    }
    setBusy("");
    setLog(fail ? `Added ${ok}. Then this failed: ${fail}${/features|column/i.test(fail) ? " (run supabase/schema_v3.sql first, then try again)" : ""}` : `Added ${ok} places.`);
    onDone();
  };

  const removeSamples = async () => {
    if (!window.confirm(`Delete the ${samples.length} sample places? Their bookings and reviews go too. This cannot be undone.`)) return;
    setBusy("remove"); setLog("");
    let n = 0;
    for (const s of samples) { try { await db.deleteSpot(s.id); n++; } catch (e) { setLog(e.message); } }
    setBusy(""); setLog(`Removed ${n} sample places.`); onDone();
  };

  return (
    <div className="card pad" style={{ marginBottom: 14 }}>
      <b>Starter data</b>
      <p className="small muted" style={{ margin: "4px 0 10px" }}>
        71 real restaurants, cafés and dessert spots across Colombo 3, 4, 5, 7, Dehiwala and Mount Lavinia, with map positions, phones and hours
        from OpenStreetMap. Add prices and menus as you visit them.
      </p>
      <div className="row">
        <button className="btn sm" onClick={importReal} disabled={Boolean(busy)}>{busy === "import" ? "Adding..." : "Add the real places"}</button>
        {samples.length > 0 && <button className="btn sm ghost" onClick={removeSamples} disabled={Boolean(busy)}>{busy === "remove" ? "Removing..." : `Remove ${samples.length} sample places`}</button>}
      </div>
      {log && <div className={"alert" + (/^(Added \d+ places|Removed|All bundled)/.test(log) ? " ok" : "")} style={{ marginTop: 10 }}>{log}</div>}
    </div>
  );
}
