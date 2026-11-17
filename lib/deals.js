// Today's deals. A place's deal: { title, detail, days: [0-6] (empty = every day), from, to ("HH:MM"), until ("YYYY-MM-DD") }.
// dealToday says whether it runs today and whether it is on right now, in Sri Lanka time on the visitor's phone.
import { niceTime, todayIso } from "./utils";

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// { state: "live" | "later", label, until } or null when there is no deal today (or it already ended today).
export function dealToday(spot, now = new Date()) {
  const d = spot && spot.deal;
  if (!d || !d.title) return null;
  if (d.until && todayIso() > d.until) return null;
  const days = Array.isArray(d.days) ? d.days : [];
  if (days.length && !days.includes(now.getDay())) return null;
  const from = d.from || spot.open_time || "00:00";
  const to = d.to || spot.close_time || "23:59";
  const t = hhmm(now);
  const overnight = to <= from;
  const live = overnight ? t >= from || t < to : t >= from && t < to;
  if (live) return { state: "live", label: `On now, until ${niceTime(to)}` };
  if (!overnight && t < from) return { state: "later", label: `Today from ${niceTime(from)}` };
  if (overnight && t < from) return { state: "later", label: `Tonight from ${niceTime(from)}` };
  return null;
}

// The same deal, checked for tomorrow: { state: "tomorrow", label } or null.
export function dealTomorrow(spot, now = new Date()) {
  const d = spot && spot.deal;
  if (!d || !d.title) return null;
  const tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const iso = `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, "0")}-${String(tm.getDate()).padStart(2, "0")}`;
  if (d.until && iso > d.until) return null;
  const days = Array.isArray(d.days) ? d.days : [];
  if (days.length && !days.includes(tm.getDay())) return null;
  return { state: "tomorrow", label: `Tomorrow from ${niceTime(d.from || spot.open_time || "00:00")}` };
}

// Places with a deal today: on now first, then those starting later. Once every deal has ended for the day
// (late at night), the row shows tomorrow's deals instead, so Home is never empty just because it is late.
export function todaysDeals(spots, now = new Date()) {
  const today = (spots || [])
    .map((s) => ({ spot: s, when: dealToday(s, now) }))
    .filter((x) => x.when)
    .sort((a, b) => (a.when.state === b.when.state ? 0 : a.when.state === "live" ? -1 : 1));
  if (today.length) return today;
  return (spots || []).map((s) => ({ spot: s, when: dealTomorrow(s, now) })).filter((x) => x.when);
}

// A plain sentence for owners: "Every day, 5:00 PM to 7:00 PM, until 31 Dec".
export function dealSchedule(d) {
  if (!d || !d.title) return "";
  const days = Array.isArray(d.days) && d.days.length && d.days.length < 7 ? d.days.map((i) => DAY_NAMES[i]).join(", ") : "Every day";
  const hours = d.from && d.to ? `${niceTime(d.from)} to ${niceTime(d.to)}` : "all opening hours";
  const until = d.until ? `, until ${new Date(d.until + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "";
  return `${days}, ${hours}${until}`;
}
