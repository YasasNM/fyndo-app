// Where a place photo came from, for the credit line. Photos uploaded by Fyndo or the owner have no entry.
// spot.photo_info = { "<url>": { source: "website" | "commons" | "osm", credit, link, license } }
export function photoMeta(spot, url) {
  const m = (spot && spot.photo_info && spot.photo_info[url]) || null;
  if (!m) return { external: false, short: "", author: "", link: "", linkLabel: "" };
  if (m.source === "website") return { external: true, short: "From their website", author: m.credit ? `${m.credit} (their website)` : "their website", link: m.link || "", linkLabel: "Visit their website" };
  if (m.source === "commons") return { external: true, short: "Wikimedia Commons", author: [m.credit, m.license].filter(Boolean).join(", "), link: m.link || "", linkLabel: "Photo details on Wikimedia Commons" };
  if (m.source === "osm") return { external: true, short: "Via OpenStreetMap", author: "linked on OpenStreetMap", link: m.link || "", linkLabel: "See it on OpenStreetMap" };
  return { external: false, short: "", author: m.credit || "", link: m.link || "", linkLabel: "Source" };
}

// Photos for the gallery, with credits.
export const galleryPhotos = (spot) => (spot.photos || []).map((url) => {
  const m = photoMeta(spot, url);
  return { url, author: m.author, link: m.link, linkLabel: m.linkLabel, external: m.external };
});
