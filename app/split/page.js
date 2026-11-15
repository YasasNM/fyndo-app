"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { lkr, shareNow } from "@/lib/utils";

export default function SplitWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Split /></Suspense>;
}

function Split() {
  const startTotal = Number(useSearchParams().get("total")) || 0;
  const [mode, setMode] = useState("equal");
  const [total, setTotal] = useState(startTotal || "");
  const [people, setPeople] = useState(["Me", "Friend 1"]);
  const [items, setItems] = useState([{ name: "", price: "", who: [0, 1] }]);
  const [addTax, setAddTax] = useState(true);
  const [note, setNote] = useState("");

  const factor = addTax ? (1 + CONFIG.serviceCharge) * (1 + CONFIG.vat) : 1;
  const n = people.length;

  let shares;
  if (mode === "equal") {
    shares = people.map(() => (Number(total) || 0) / n);
  } else {
    shares = people.map(() => 0);
    items.forEach((it) => {
      const p = Number(it.price) || 0;
      if (!it.who.length || !p) return;
      it.who.forEach((w) => { if (w < n) shares[w] += (p * factor) / it.who.length; });
    });
  }
  const sum = shares.reduce((a, b) => a + b, 0);
  const rounded = shares.map((s) => Math.ceil(s / 10) * 10); // round up to nearest LKR 10 so nobody is short

  const setName = (i, v) => setPeople(people.map((p, k) => (k === i ? v : p)));
  const addPerson = () => { if (n < 12) setPeople([...people, `Friend ${n}`]); };
  const removePerson = (i) => {
    if (n <= 2) return;
    setPeople(people.filter((_, k) => k !== i));
    setItems(items.map((it) => ({ ...it, who: it.who.filter((w) => w !== i).map((w) => (w > i ? w - 1 : w)) })));
  };
  const setItem = (i, patch) => setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const toggleWho = (i, w) => { const it = items[i]; setItem(i, { who: it.who.includes(w) ? it.who.filter((x) => x !== w) : [...it.who, w] }); };

  const message = () =>
    `Bill split${note ? " for " + note : ""} 🍽️\n` + people.map((p, i) => `${p}: ${lkr(rounded[i])}`).join("\n") +
    `\nTotal: ${lkr(Math.round(mode === "equal" ? Number(total) || 0 : sum))} (shares rounded up to the next LKR 10)`;

  return (
    <div className="narrow">
      <h1>Split the bill</h1>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={mode === "equal" ? "on" : ""} onClick={() => setMode("equal")}>Equal split</button>
        <button className={mode === "dish" ? "on" : ""} onClick={() => setMode("dish")}>By dish</button>
      </div>

      <label className="field"><span>What is it for? (optional)</span>
        <input className="input" value={note} maxLength={40} onChange={(e) => setNote(e.target.value)} placeholder="Friday dinner" /></label>

      <div className="field"><span>People</span>
        {people.map((p, i) => (
          <div key={i} className="row" style={{ flexWrap: "nowrap", marginBottom: 6 }}>
            <input className="input" value={p} maxLength={20} onChange={(e) => setName(i, e.target.value)} aria-label={`Person ${i + 1}`} />
            {n > 2 && <button className="linkbtn" onClick={() => removePerson(i)} aria-label="Remove person">✕</button>}
          </div>
        ))}
        {n < 12 && <button className="btn sm ghost" onClick={addPerson}>+ Add person</button>}
      </div>

      {mode === "equal" ? (
        <label className="field"><span>Total bill (LKR)</span>
          <input className="input" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="12500" /></label>
      ) : (
        <div className="field"><span>Dishes</span>
          {items.map((it, i) => (
            <div key={i} className="card pad" style={{ marginBottom: 8 }}>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input className="input" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="Dish" />
                <input className="input" style={{ width: 110 }} type="number" min="0" value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} placeholder="LKR" />
                {items.length > 1 && <button className="linkbtn" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label="Remove dish">✕</button>}
              </div>
              <div className="row small" style={{ gap: 6, marginTop: 6 }}>
                <span className="muted">Shared by:</span>
                {people.map((p, w) => <button key={w} className={"chip" + (it.who.includes(w) ? " on" : "")} onClick={() => toggleWho(i, w)}>{p || `P${w + 1}`}</button>)}
              </div>
            </div>
          ))}
          <button className="btn sm ghost" onClick={() => setItems([...items, { name: "", price: "", who: people.map((_, k) => k) }])}>+ Add dish</button>
          <label className="row small" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={addTax} onChange={(e) => setAddTax(e.target.checked)} />
            Add {Math.round(CONFIG.serviceCharge * 100)}% service charge and {Math.round(CONFIG.vat * 100)}% VAT
          </label>
        </div>
      )}

      <h2>Each person pays</h2>
      <div className="card pad">
        {people.map((p, i) => <div key={i} className="kv"><span>{p || `Person ${i + 1}`}</span><b>{lkr(rounded[i])}</b></div>)}
        <div className="kv"><span className="muted">Bill total</span><span>{lkr(Math.round(mode === "equal" ? Number(total) || 0 : sum))}</span></div>
      </div>
      <p className="small muted">Shares are rounded up to the next LKR 10 so the full bill is always covered.</p>
      <button className="btn block" onClick={() => shareNow({ title: "Bill split", text: message() })}>Send the split on WhatsApp</button>
    </div>
  );
}
