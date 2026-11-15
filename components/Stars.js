"use client";

// Read-only stars (value 0-5) or a tappable picker when onChange is given.
export default function Stars({ value = 0, onChange, size = 16 }) {
  return (
    <span className="stars" style={{ fontSize: size }} role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>★</button>
        ) : (
          <span key={n} className={n <= Math.round(value) ? "on" : ""}>★</span>
        )
      )}
    </span>
  );
}

export function RatingPill({ rating }) {
  if (!rating || !rating.count) return null;
  return <span className="ratepill">★ {rating.avg.toFixed(1)} <span>({rating.count})</span></span>;
}
