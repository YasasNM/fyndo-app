"use client";
import { useRef, useState } from "react";
import { Ico } from "./Icon";
import { db } from "@/lib/data";
import { findPhotos } from "@/lib/api";

const SOURCE = { website: "their website", commons: "Wikimedia Commons", osm: "OpenStreetMap" };
const info = (c) => ({ source: c.source, credit: c.credit || "", link: c.link || "", license: c.license || "" });
const friendly = (e) => (e.status === 404 || /Something went wrong/.test(e.message) ? "The photo finder runs on the live site's server. Deploy, then try again there." : e.message);

// Adds photos to a place and remembers where each came from (for the credit line).
async function addPhotos(spot, picks, website) {
  const photos = [...(spot.photos || []), ...picks.map((c) => c.url)].filter((u, i, a) => a.indexOf(u) === i).slice(0, 12);
  const photo_info = { ...(spot.photo_info || {}) };
  picks.forEach((c) => (photo_info[c.url] = info(c)));
  const patch = { photos, photo_info };
  if (website && !spot.website) patch.website = website;
  await db.updateSpot(spot.id, patch);
  return patch;
}

// Admin, Spots tab: goes through places with no photos and finds real ones.
export default function AdminPhotos({ spots, onDone }) {
  const missing = spots.filter((s) => !(s.photos && s.photos.length));
  const [auto, setAuto] = useState(true);
  const [run, setRun] = useState(null); // { i, total, found, log: [] }
  const [err, setErr] = useState("");
  const stop = useRef(false);

  const start = async () => {
    setErr(""); stop.current = false;
    const list = missing.slice();
    const st = { i: 0, total: list.length, found: 0, log: [] };
    setRun({ ...st });
    for (const s of list) {
      if (stop.current) break;
      st.i++;
      try {
        const r = await findPhotos(s);
        const c = r.candidates || [];
        if (c.length && auto) {
          const picks = c.filter((x) => x.score >= 2).slice(0, 3);
          if (picks.length) {
            await addPhotos(s, picks, r.websiteFrom === "osm" ? r.website : "");
            st.found++;
            st.log.unshift({ id: s.id, name: s.name, text: `Added ${picks.length} photo${picks.length > 1 ? "s" : ""} from ${[...new Set(picks.map((p) => SOURCE[p.source]))].join(" and ")}`, thumb: picks[0].url });
          } else st.log.unshift({ id: s.id, name: s.name, text: "Only weak matches. Check it by hand in Edit.", weak: true });
        } else if (c.length) {
          st.log.unshift({ id: s.id, name: s.name, text: `${c.length} found, waiting for you`, spot: s, cands: c, website: r.websiteFrom === "osm" ? r.website : "" });
        } else st.log.unshift({ id: s.id, name: s.name, text: "Nothing found", none: true });
      } catch (e) {
        if (e.status === 401 || e.status === 403 || e.status === 404 || e.status === 503) { setErr(friendly(e)); break; }
        st.log.unshift({ id: s.id, name: s.name, text: "Skipped: " + e.message, none: true });
      }
      setRun({ ...st, log: st.log.slice(0, 60) });
    }
    setRun((r) => r && { ...r, done: true });
    onDone && onDone();
  };

  const accept = async (row, c) => {
    try { await addPhotos(row.spot, [c], row.website); setRun((r) => ({ ...r, log: r.log.map((x) => (x === row ? { ...x, text: "Added 1 photo", cands: null, thumb: c.url } : x)) })); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="card pad" style={{ margin: "12px 0" }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div style={{ maxWidth: 560 }}>
          <b>Find real photos</b>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            {missing.length} of {spots.length} places have no photo of their own. This looks each one up on OpenStreetMap, Wikimedia Commons and
            the place&apos;s own website, and adds what it finds with a credit. Owners can add their own photos once they claim their page.
          </p>
        </div>
        {run && !run.done
          ? <button className="btn ghost sm" onClick={() => (stop.current = true)}>Stop</button>
          : <button className="btn sm" onClick={start} disabled={!missing.length}><Ico n="search" size={16} />{run ? "Run again" : "Find photos"}</button>}
      </div>
      <label className="row small" style={{ marginTop: 10 }}><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Add the best matches straight away (you can remove any photo in Edit)</label>
      {err && <div className="alert">{err}</div>}
      {run && (
        <div style={{ marginTop: 10 }}>
          <div className="progress" aria-hidden="true"><div style={{ width: `${run.total ? (run.i / run.total) * 100 : 100}%` }} /></div>
          <p className="small" aria-live="polite" style={{ margin: "0 0 8px" }}>
            {run.done ? "Finished." : `Checking ${run.i} of ${run.total}...`} Photos found for {run.found} place{run.found === 1 ? "" : "s"}.
          </p>
          <div className="stack">
            {run.log.map((row) => (
              <div key={row.id} className="findrow">
                {row.thumb ? <img src={row.thumb} alt="" referrerPolicy="no-referrer" /> : <span className="findrow-ph"><Ico n={row.none ? "close" : "info"} size={16} /></span>}
                <div style={{ minWidth: 0 }}>
                  <b className="small">{row.name}</b>
                  <div className="small muted">{row.text}</div>
                  {row.cands && (
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      {row.cands.map((c) => (
                        <button key={c.url} type="button" className="findpick" onClick={() => accept(row, c)} title={`Use this photo from ${SOURCE[c.source]}`}>
                          <img src={c.url} alt={`Photo from ${SOURCE[c.source]}`} referrerPolicy="no-referrer" /><span>Use</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Spot form: look up photos for this one place and add the ones you pick.
export function PhotoSuggest({ spot, onAdd }) {
  const [state, setState] = useState(null); // null | "busy" | { cands, website } | { err }
  const look = async () => {
    setState("busy");
    try { const r = await findPhotos(spot); setState({ cands: r.candidates || [], website: r.websiteFrom === "osm" ? r.website : "" }); }
    catch (e) { setState({ err: friendly(e) }); }
  };
  return (
    <div className="field">
      <span>Real photos of this place</span>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn sm ghost" onClick={look} disabled={state === "busy" || !spot.name}><Ico n="search" size={16} />{state === "busy" ? "Looking..." : "Find real photos"}</button>
        <span className="small muted">From OpenStreetMap, Wikimedia Commons and their website.</span>
      </div>
      {state && state.err && <div className="alert">{state.err}</div>}
      {state && state.cands && (state.cands.length ? (
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {state.cands.map((c) => {
            const added = (spot.photos || []).includes(c.url);
            return (
              <button key={c.url} type="button" className={"findpick" + (added ? " on" : "")} disabled={added}
                onClick={() => onAdd(c.url, info(c), state.website)} title={`From ${SOURCE[c.source]}${c.credit ? ": " + c.credit : ""}`}>
                <img src={c.url} alt={`Photo from ${SOURCE[c.source]}`} referrerPolicy="no-referrer" /><span>{added ? "Added" : "Add"}</span>
              </button>
            );
          })}
        </div>
      ) : <p className="small muted" style={{ margin: "6px 0 0" }}>Nothing found. Add your own photos below, or ask the owner to claim the page.</p>)}
    </div>
  );
}
