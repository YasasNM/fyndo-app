"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ico } from "./Icon";
import { photoSrc } from "@/lib/api";
import VenuePhoto from "@/components/VenuePhoto";

// Google photos for a place. To keep Google costs low only the photo you are looking at is loaded:
// the cover first, then one more each time you move to the next one.
const srcOf = (ph, w) => ph.url || photoSrc(ph.name, w);

export default function PhotoGallery({ photos, placeName }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const touchX = useRef(null);
  const n = photos.length;
  const cur = photos[Math.min(i, n - 1)];

  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current && closeRef.current.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      openerRef.current && openerRef.current.focus();
    };
  }, [open, prev, next]);

  const swipe = (e) => {
    if (touchX.current === null || n < 2) return;
    const d = touchX.current - e.changedTouches[0].clientX;
    touchX.current = null;
    if (Math.abs(d) > 42) (d > 0 ? next : prev)();
  };

  if (!n) return <VenuePhoto className="spothero" />;

  return (
    <>
      <div className="gal" onTouchStart={(e) => (touchX.current = e.touches[0].clientX)} onTouchEnd={swipe}>
        <button ref={openerRef} type="button" className="gal-img" onClick={() => setOpen(true)} aria-label={`Open photo ${i + 1} of ${n} of ${placeName} full screen`}>
          <VenuePhoto className="gal-photo" src={srcOf(cur, 900)} alt={`Photo ${i + 1} of ${placeName}`} external={cur.external} />
        </button>
        {cur.author && <span className="gcredit">Photo: {cur.author}</span>}
        {n > 1 && (
          <>
            <button type="button" className="gal-nav l" onClick={prev} aria-label="Previous photo"><Ico n="arrow" size={20} style={{ transform: "scaleX(-1)" }} /></button>
            <button type="button" className="gal-nav r" onClick={next} aria-label="Next photo"><Ico n="arrow" size={20} /></button>
            <span className="gal-count" aria-live="polite">{i + 1} of {n}</span>
          </>
        )}
      </div>

      {open && (
        <div className="lb" role="dialog" aria-modal="true" aria-label={`${placeName} photos`} onClick={() => setOpen(false)}>
          <div className="lb-top" onClick={(e) => e.stopPropagation()}>
            <div style={{ minWidth: 0 }}>
              <b className="lb-title">{placeName}</b>
              <div className="small" style={{ opacity: 0.75 }}>
                {i + 1} of {n}{cur.author ? `, photo by ${cur.author}` : ""}
              </div>
            </div>
            <button ref={closeRef} type="button" className="lb-btn" onClick={() => setOpen(false)} aria-label="Close photos"><Ico n="close" size={22} /></button>
          </div>
          <div className="lb-stage" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => (touchX.current = e.touches[0].clientX)} onTouchEnd={swipe}>
            {n > 1 && <button type="button" className="lb-btn lb-l" onClick={prev} aria-label="Previous photo"><Ico n="arrow" size={22} style={{ transform: "scaleX(-1)" }} /></button>}
            <VenuePhoto className="lb-photo" src={srcOf(cur, 1400)} alt={`Photo ${i + 1} of ${placeName}`} external={cur.external} />
            {n > 1 && <button type="button" className="lb-btn lb-r" onClick={next} aria-label="Next photo"><Ico n="arrow" size={22} /></button>}
          </div>
          <div className="lb-foot" onClick={(e) => e.stopPropagation()}>
            {cur.mapsUrl && <a className="linkbtn" href={cur.mapsUrl} target="_blank" rel="noreferrer">View on Google Maps</a>}
            {cur.link && <a className="linkbtn" href={cur.link} target="_blank" rel="noreferrer">{cur.linkLabel || "Source"}</a>}
          </div>
        </div>
      )}
    </>
  );
}
