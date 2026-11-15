"use client";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSpots, useRatings } from "@/lib/hooks";
import { Thumb } from "@/components/SpotCard";
import { featureOf } from "@/lib/features";
import { avgPrice, isOpenAt, niceTime, priceLabel } from "@/lib/utils";

export default function CompareWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Compare /></Suspense>;
}

function Compare() {
  const ids = (useSearchParams().get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const { spots } = useSpots();
  const ratings = useRatings();
  const picked = useMemo(() => (spots ? ids.map((i) => spots.find((s) => s.id === i)).filter(Boolean) : []), [spots, ids.join(",")]); // eslint-disable-line
  if (!spots) return <div className="loading">Loading...</div>;
  if (picked.length < 2) return <div className="empty"><div className="big">⚖️</div>Pick 2 or 3 places on the home page to compare.<br /><Link href="/" className="linkbtn">Go home</Link></div>;

  const now = new Date();
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const cheapest = Math.min(...picked.map(avgPrice));
  const best = Math.max(...picked.map((s) => (ratings[s.id] ? ratings[s.id].avg : 0)));
  const rows = [
    ["Price", (s) => <span style={avgPrice(s) === cheapest ? { color: "var(--green)", fontWeight: 700 } : {}}>{priceLabel(s)}{avgPrice(s) === cheapest ? " ✓" : ""}</span>],
    ["Fyndo rating", (s) => { const r = ratings[s.id]; return r ? <span style={r.avg === best ? { color: "var(--green)", fontWeight: 700 } : {}}>★ {r.avg.toFixed(1)} ({r.count}){r.visited ? ` · ${r.visited} visited` : ""}</span> : <span className="muted">No reviews yet</span>; }],
    ["Open now", (s) => (isOpenAt(s, t) ? <span className="open-now">Yes</span> : <span className="closed-now">Closed</span>)],
    ["Hours", (s) => `${niceTime(s.open_time)} to ${niceTime(s.close_time)}`],
    ["Area", (s) => s.area],
    ["Type", (s) => s.category],
    ["Vibe", (s) => (s.moods || []).slice(0, 4).join(", ") || "-"],
    ["Facilities", (s) => (s.features || []).map((f) => (featureOf(f) || {}).label).filter(Boolean).join(", ") || "-"],
    ["Booking", (s) => (s.booking_enabled ? (s.booking_mode === "instant" ? "Instant" : "Request") : "Call / WhatsApp")],
    ["Verified", (s) => (s.verified ? "Yes" : "Not yet")],
  ];

  return (
    <>
      <h1>Compare</h1>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="simple compare">
          <thead>
            <tr><th></th>{picked.map((s) => (
              <th key={s.id}><Link href={`/spot?id=${s.id}`}><Thumb spot={s} className="mini" /><div style={{ marginTop: 6 }}>{s.name}</div></Link></th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}><td className="muted small" style={{ whiteSpace: "nowrap" }}>{label}</td>{picked.map((s) => <td key={s.id}>{fn(s)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn ghost" href="/">← Back</Link>
      </div>
    </>
  );
}
