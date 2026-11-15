"use client";
import { Ico } from "@/components/Icon";

// Read-only stars (value 0-5) or a tappable picker when onChange is given.
export default function Stars({ value = 0, onChange, size = 16 }) {
  const star = (n, on) => (
    <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
  return (
    <span className="stars" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>{star(n, n <= value)}</button>
        ) : (
          <span key={n} className={n <= Math.round(value) ? "on" : ""}>{star(n, n <= Math.round(value))}</span>
        )
      )}
    </span>
  );
}

export function RatingPill({ rating }) {
  if (!rating || !rating.count) return null;
  return (
    <span className="ratepill"><Ico n="star" size={13} strokeWidth={2} style={{ fill: "currentColor" }} />{rating.avg.toFixed(1)}<span>({rating.count})</span></span>
  );
}
