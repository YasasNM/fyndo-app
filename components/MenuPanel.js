"use client";
import { Ico } from "./Icon";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { DISH_TAGS } from "@/lib/features";
import { dishNote } from "@/lib/glossary";
import { billEstimate, lkr, usd } from "@/lib/utils";

// Menu with dish labels, a tourist explanation, optional USD, and a "what will it cost?" estimator.
export default function MenuPanel({ spot }) {
  const menu = spot.menu || [];
  const [qty, setQty] = useState({});
  const [tourist, setTourist] = useState(false);
  useEffect(() => { try { setTourist(localStorage.getItem("fyndo_tourist") === "1"); } catch {} }, []);
  const flip = () => { const v = !tourist; setTourist(v); try { localStorage.setItem("fyndo_tourist", v ? "1" : "0"); } catch {} };

  if (!menu.length) return null;
  const change = (i, d) => setQty((q) => ({ ...q, [i]: Math.max(0, Math.min(20, (q[i] || 0) + d)) }));
  const sub = menu.reduce((a, m, i) => a + (qty[i] || 0) * (Number(m.price) || 0), 0);
  const est = billEstimate(sub, CONFIG);
  const price = (n) => (tourist ? `${lkr(n)} (${usd(n, CONFIG.usdRate)})` : lkr(n));
  const stars = menu.filter((m) => (m.tags || []).includes("star")).slice(0, 3);

  return (
    <>
      <div className="row between">
        <h2>Menu & prices</h2>
        <button className={"chip" + (tourist ? " on" : "")} onClick={flip} title="Shows USD and explains local dishes" aria-pressed={tourist}><Ico n="globe" size={16} />Tourist mode</button>
      </div>
      {stars.length > 0 && <p className="small" style={{ margin: "0 0 8px" }}>Signature dishes: {stars.map((m) => m.item).join(", ")}</p>}
      <div className="card pad">
        {menu.map((m, i) => {
          const note = tourist ? dishNote(m.item) : "";
          return (
            <div key={i} className="menu-row" style={{ alignItems: "flex-start", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {m.item}
                {(m.tags || []).filter((t) => t !== "star" && DISH_TAGS[t]).length > 0 && (
                  <span className="row" style={{ gap: 4, margin: "3px 0" }}>{m.tags.filter((t) => t !== "star" && DISH_TAGS[t]).map((t) => <span key={t} className="tag">{DISH_TAGS[t]}</span>)}</span>
                )}
                {note && <span className="small" style={{ display: "block", color: "var(--teal-2)" }}>{note}</span>}
              </span>
              <b style={{ whiteSpace: "nowrap" }}>{price(m.price)}</b>
              <span className="stepper" style={{ transform: "scale(.86)", transformOrigin: "right top" }}>
                <button aria-label={`Less ${m.item}`} onClick={() => change(i, -1)}>−</button>
                <b>{qty[i] || 0}</b>
                <button aria-label={`More ${m.item}`} onClick={() => change(i, 1)}>+</button>
              </span>
            </div>
          );
        })}
        {spot.menu_updated_at && <div className="small muted" style={{ marginTop: 8 }}>Prices checked on {spot.menu_updated_at}</div>}
      </div>

      {sub > 0 && (
        <div className="card pad" style={{ marginTop: 10, background: "var(--cream)" }}>
          <b>What will it cost?</b>
          <div className="kv"><span>Food and drinks</span><span>{lkr(est.subtotal)}</span></div>
          <div className="kv"><span>Service charge ({Math.round(CONFIG.serviceCharge * 100)}%)</span><span>{lkr(est.sc)}</span></div>
          <div className="kv"><span>VAT ({Math.round(CONFIG.vat * 100)}%)</span><span>{lkr(est.vat)}</span></div>
          <div className="kv"><b>Estimated bill</b><b>{price(est.total)}</b></div>
          <p className="small muted" style={{ margin: "6px 0 0" }}>An estimate. Some places add different charges, so check the real bill.</p>
          <a className="linkbtn" href={`/split/?total=${est.total}`}>Split this bill</a>
        </div>
      )}
    </>
  );
}
