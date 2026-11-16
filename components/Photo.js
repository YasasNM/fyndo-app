import Link from "next/link";
import { PHOTOS } from "@/lib/photoCredits";

// A real photo from Wikimedia Commons, with its credit (required by the licence).
// Two sizes ship: 500 px for phones and 1280 px for wider screens.
export default function Photo({ slug, className = "", sizes = "(max-width: 760px) 100vw, 640px", eager = false, children }) {
  const p = PHOTOS[slug];
  if (!p) return null;
  return (
    <figure className={"photo " + className} style={{ "--ratio": p.ratio }}>
      <img
        src={`/img/${slug}-1280.jpg`}
        srcSet={`/img/${slug}-500.jpg 500w, /img/${slug}-1280.jpg 1280w`}
        sizes={sizes}
        alt={p.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
      {children}
      <figcaption className="photocredit">
        <Link href="/credits">Photo: {p.author}, {p.license}</Link>
      </figcaption>
    </figure>
  );
}
