"use client";
import { useState } from "react";
import { Ico } from "@/components/Icon";

// Only venue-supplied URLs belong here; missing or failed photos never become stock images.
export default function VenuePhoto({ src, alt = "", className = "", external = false, children }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const available = Boolean(src && failedSrc !== src);
  return (
    <div className={`venue-photo ${className}${available ? "" : " no-venue-photo"}`}>
      {available ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy={external ? "no-referrer" : undefined} onError={() => setFailedSrc(src)} />
      ) : (
        <div className="venue-photo-empty" role="img" aria-label="No venue photo">
          <Ico n="pin" size={32} strokeWidth={1.4} />
          <span>No venue photo</span>
        </div>
      )}
      {children}
    </div>
  );
}
