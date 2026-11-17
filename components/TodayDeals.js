"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ico } from "./Icon";
import { coverFor } from "@/lib/coverPhotos";
import { todaysDeals, dealToday, dealTomorrow } from "@/lib/deals";

// Re-check every minute so "on now" and "from 5 pm" stay true while the page is open.
function useNow() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

function photoOf(spot) {
  if (spot.photos && spot.photos[0]) return { src: spot.photos[0], example: false };
  const ex = coverFor(spot);
  return ex ? { src: ex.src, example: !ex.real } : null;
}

// Home: a row of deals running today, on-now first. Hidden when no place has a deal today.
export default function TodayDeals({ spots }) {
  const now = useNow();
  if (!now || !spots) return null;
  const list = todaysDeals(spots, now).slice(0, 10);
  if (!list.length) return null;
  const liveCount = list.filter((x) => x.when.state === "live").length;
  const tomorrow = list[0].when.state === "tomorrow";
  return (
    <section className="deals" aria-labelledby="deals-h">
      <div className="deals-head">
        <h2 id="deals-h">{tomorrow ? "Deals tomorrow" : "Today's deals"}</h2>
        <span className="small muted">{tomorrow ? "Today's deals have ended" : liveCount ? `${liveCount} on now` : "Starting later today"}</span>
      </div>
      <div className="deals-row">
        {list.map(({ spot, when }) => {
          const ph = photoOf(spot);
          return (
            <Link key={spot.id} href={`/spot?id=${spot.id}`} className="deal">
              {ph && <img className="deal-img" src={ph.src} alt="" loading="lazy" decoding="async" />}
              <span className="deal-glass">
                <span className={"deal-when " + when.state}>{when.state === "live" && <i aria-hidden="true" />}{when.label}</span>
                <b className="deal-title">{spot.deal.title}</b>
                <span className="deal-place">{spot.name}, {spot.area}</span>
              </span>
              {ph && ph.example && <span className="deal-example">Example photo</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Place page: the deal, with its timing for today (or its usual days when it is not on today).
export function DealBanner({ spot }) {
  const now = useNow();
  const d = spot && spot.deal;
  if (!now || !d || !d.title) return null;
  const when = dealToday(spot, now) || dealTomorrow(spot, now);
  return (
    <div className="dealbanner">
      <span className="gem-tile gem-ruby"><Ico n="ticket" size={20} fill /></span>
      <span className="dealbanner-text">
        <b>{d.title}</b>
        {d.detail && <span className="small">{d.detail}</span>}
        <span className={"deal-when " + (when ? when.state : "off")}>{when && when.state === "live" && <i aria-hidden="true" />}{when ? when.label : "Not on right now"}</span>
      </span>
    </div>
  );
}
