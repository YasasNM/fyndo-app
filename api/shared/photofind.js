// Finds REAL photos of a place from free sources that allow showing them:
//  1. OpenStreetMap (ODbL): the place's own "image", "wikimedia_commons" or "wikidata" tags, and its website
//  2. Wikimedia Commons (open licences): photos taken right at the place whose title names it
//  3. The place's own website: its share image (og:image), the picture it chose for link previews
// Every result carries where it came from, so the app can credit it.
const dns = require("dns").promises;
const net = require("net");

const UA = "FyndoPhotoFinder/1.0 (+open data photo lookup)";
const STOP = new Set(["the", "and", "restaurant", "restaurants", "cafe", "caf", "coffee", "hotel", "colombo", "kandy", "galle", "lanka", "sri",
  "bar", "grill", "kitchen", "house", "food", "foods", "by", "of", "at", "de", "la", "le", "pvt", "ltd", "branch", "shop", "centre", "center",
  "lk", "jpg", "jpeg", "png", "file", "img", "photo", "dsc"]);

// Area names say where a branch is, not what it is called ("The Fab - Mount Lavinia").
const PLACES = new Set(["mount", "lavinia", "dehiwala", "wellawatta", "wellawatte", "bambalapitiya", "kollupitiya", "nugegoda", "rajagiriya",
  "battaramulla", "borella", "maradana", "pettah", "fort", "kotte", "wattala", "negombo", "rathmalana", "ratmalana", "moratuwa", "jawatte",
  "havelock", "kotahena", "colpetty", "slave", "island", "maharagama", "kohuwala", "kirulapone", "thimbirigasyaya", "narahenpita", "malabe", "panadura"]);
const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
// "Caravan Fresh - Colombo 4" -> "Caravan Fresh"; "A2B (Colombo)" -> "A2B"
const coreName = (s) => String(s || "").replace(/\(.*?\)/g, " ").split(/\s[-–|]\s|,/)[0].trim();
function tokens(s) { return norm(coreName(s)).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t) && !PLACES.has(t) && !/^\d+$/.test(t)); }

// Share of the place name's words that appear as whole words in the other text (0..1).
function matchScore(placeName, text) {
  const want = tokens(placeName);
  if (!want.length) return 0;
  const have = " " + norm(text).replace(/[^a-z0-9]+/g, " ") + " ";
  return want.filter((t) => have.includes(" " + t + " ")).length / want.length;
}
// Same place name both ways. One-word names must match exactly; longer names need half their words.
function sameName(a, b) {
  const s = Math.min(matchScore(a, b), matchScore(b, a));
  return tokens(a).length < 2 || tokens(b).length < 2 ? (s === 1 ? 1 : 0) : s >= 0.5 ? s : 0;
}

// ---------- safe fetching (the website address comes from data, so never reach private networks) ----------
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}
async function checkUrl(u) {
  const url = new URL(u);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only web addresses are allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Unusual port.");
  if (url.username || url.password) throw new Error("Bad address.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("Address not allowed.");
  return url;
}
async function readCapped(res, max) {
  if (!res.body || !res.body.getReader) return Buffer.from(await res.arrayBuffer()).subarray(0, max);
  const reader = res.body.getReader(); const parts = []; let n = 0;
  while (n < max) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(Buffer.from(value)); n += value.length;
  }
  try { await reader.cancel(); } catch {}
  return Buffer.concat(parts).subarray(0, max);
}
async function fetchSafe(u, { max = 512 * 1024, timeout = 7000, accept = "*/*" } = {}) {
  let url = u;
  for (let hop = 0; hop < 4; hop++) {
    await checkUrl(url);
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(timeout) });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).href; continue; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return { url, type: String(res.headers.get("content-type") || ""), body: await readCapped(res, max) };
  }
  throw new Error("Too many redirects.");
}

// ---------- image size from the first bytes (PNG, JPEG, WebP) ----------
function imageSize(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (kind === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L") { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  }
  return null;
}

// ---------- website share image ----------
const SOCIAL = /(^|\.)(facebook|fb|instagram|tiktok|linktr|twitter|x|google|goo|wa|whatsapp|youtube|pickme|ubereats|uber)\.(com|me|gl|ee|lk)$/i;
function shareImages(html, base) {
  const out = [];
  const re = /<meta\b[^>]*>/gi; let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const key = (tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!key || !/^(og:image(:secure_url|:url)?|twitter:image(:src)?)$/i.test(key)) continue;
    const val = (tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!val) continue;
    try { out.push(new URL(val.replace(/&amp;/g, "&").trim(), base).href); } catch {}
  }
  return [...new Set(out)];
}
async function checkImage(src) {
  if (/logo|icon|favicon|sprite|placeholder|default|avatar|badge/i.test(src)) return null;
  const { url, type, body } = await fetchSafe(src, { max: 96 * 1024, accept: "image/*" });
  if (!/^image\/(jpeg|png|webp)/i.test(type)) return null;
  const s = imageSize(body);
  if (!s || s.w < 480 || s.h < 300) return null;
  const r = s.w / s.h;
  if (r > 2.6 || r < 0.6) return null;
  return { url: url.startsWith("https:") ? url : null, w: s.w, h: s.h };
}
async function fromWebsite(site) {
  let host;
  try { host = new URL(site).hostname; } catch { return []; }
  if (SOCIAL.test(host)) return [];
  let page;
  try { page = await fetchSafe(site, { max: 700 * 1024, accept: "text/html" }); }
  catch (e) {
    const root = new URL("/", site).href;
    if (root === site) throw e;
    page = await fetchSafe(root, { max: 700 * 1024, accept: "text/html" }); // listed page moved: try the home page
  }
  if (!/html/i.test(page.type)) return [];
  const html = page.body.toString("utf8");
  const credit = host.replace(/^www\./, "");
  const out = [];
  for (const src of shareImages(html, page.url).slice(0, 3)) {
    const ok = await checkImage(src).catch(() => null);
    if (ok && ok.url) out.push({ url: ok.url, w: ok.w, h: ok.h, source: "website", credit, link: page.url, score: 2.5 });
  }
  // No usable share image: try the big photos on the home page (hero and gallery shots), keeping one or two.
  if (!out.length) {
    for (const src of pageImages(html, page.url).slice(0, 8)) {
      const ok = await checkImage(src).catch(() => null);
      if (ok && ok.url && ok.w >= 700 && ok.w / ok.h >= 1.1) out.push({ url: ok.url, w: ok.w, h: ok.h, source: "website", credit, link: page.url, score: 2 });
      if (out.length >= 2) break;
    }
  }
  return out;
}
function pageImages(html, base) {
  const out = [];
  const re = /<img\b[^>]*>/gi; let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const src = (tag.match(/\b(?:data-src|data-lazy-src|src)\s*=\s*["']([^"']+\.(?:jpe?g|webp|png)(?:\?[^"']*)?)["']/i) || [])[1];
    if (!src || /logo|icon|favicon|sprite|placeholder|avatar|badge|payment|flag/i.test(src)) continue;
    try { out.push(new URL(src.replace(/&amp;/g, "&"), base).href); } catch {}
  }
  return [...new Set(out)];
}

// ---------- OpenStreetMap ----------
// Nominatim (OpenStreetMap's search): the named place within ~400 m, with its extra tags.
// Its usage policy allows about one request a second; the admin tool runs places one after another.
let lastNominatim = 0;
async function nominatim(q, lat, lng) {
  const wait = lastNominatim + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  const d = 0.004;
  const u = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ format: "jsonv2", extratags: "1", limit: "8", bounded: "1",
    viewbox: `${lng - d},${lat + d},${lng + d},${lat - d}`, q });
  const res = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("map search answered " + res.status);
  return res.json();
}
async function osmPlace(name, lat, lng) {
  const short = tokens(name).join(" ");
  for (const q of [...new Set([coreName(name), short])].filter(Boolean)) {
    const rows = (await nominatim(q, lat, lng)).map((r) => ({ r, s: sameName(name, r.name || "") })).sort((a, b) => b.s - a.s);
    if (rows[0] && rows[0].s > 0) return { id: rows[0].r.osm_type + "/" + rows[0].r.osm_id, tags: { name: rows[0].r.name, ...(rows[0].r.extratags || {}) } };
  }
  return null;
}

// ---------- Wikimedia Commons ----------
const OK_LIC = /^(cc by(-sa)? [0-9.]+|cc0|public domain|pd)/i;
const strip = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
async function commonsInfo(titles) {
  if (!titles.length) return [];
  const u = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ action: "query", format: "json", prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280", titles: titles.slice(0, 40).join("|") });
  const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) }).then((x) => x.json()).catch(() => ({}));
  return Object.values((r.query && r.query.pages) || {}).map((p) => {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !/^image\/(jpeg|png|webp)/.test(ii.mime) || ii.width < 600) return null;
    const m = ii.extmetadata || {};
    const license = strip(m.LicenseShortName && m.LicenseShortName.value);
    if (!OK_LIC.test(license)) return null;
    return { title: p.title, url: ii.thumburl || ii.url, w: ii.thumbwidth || ii.width, h: ii.thumbheight || ii.height,
      source: "commons", credit: strip(m.Artist && m.Artist.value).slice(0, 80) || "Wikimedia Commons", license, link: ii.descriptionurl };
  }).filter(Boolean);
}
async function wikidataImage(qid) {
  if (!/^Q\d+$/.test(qid || "")) return null;
  const r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) }).then((x) => x.json()).catch(() => null);
  const c = r && r.entities && r.entities[qid] && r.entities[qid].claims && r.entities[qid].claims.P18;
  const v = c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value;
  return v ? "File:" + v : null;
}
async function commonsNear(name, lat, lng) {
  const u = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ action: "query", format: "json", list: "geosearch",
    gscoord: `${lat}|${lng}`, gsradius: "150", gsnamespace: "6", gslimit: "50" });
  const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) }).then((x) => x.json()).catch(() => ({}));
  // A photo taken here counts only if its title names the place (a short name must match fully).
  const need = tokens(name).length < 2 ? 1 : 0.6;
  const titles = ((r.query && r.query.geosearch) || []).map((g) => g.title).filter((t) => matchScore(name, t.replace(/^File:/, "").replace(/\.\w+$/, "")) >= need);
  return (await commonsInfo(titles)).map((c) => ({ ...c, score: 1.5 + matchScore(name, c.title) }));
}

// Main entry: { name, lat, lng, website } -> { candidates, website, osm }
async function findPhotos({ name, lat, lng, website }, { websiteLookup } = {}) {
  const hasPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const out = []; const notes = [];
  let osm = null;
  let websiteFrom = website ? "given" : "";
  if (hasPos) {
    osm = await osmPlace(name, lat, lng).catch((e) => { notes.push("OpenStreetMap: " + e.message); return null; });
    if (osm) {
      const t = osm.tags;
      const files = [];
      if (/^File:/i.test(t.wikimedia_commons || "")) files.push(t.wikimedia_commons);
      const wd = await wikidataImage(t.wikidata || t["brand:wikidata"]).catch(() => null);
      if (wd) files.push(wd);
      (await commonsInfo(files)).forEach((c) => out.push({ ...c, score: 3 }));
      if (/^https:\/\//.test(t.image || "")) {
        const ok = await checkImage(t.image).catch(() => null);
        if (ok && ok.url) out.push({ url: ok.url, w: ok.w, h: ok.h, source: "osm", credit: "OpenStreetMap contributors", link: `https://www.openstreetmap.org/${osm.id}`, score: 3 });
      }
      if (!website && (t.website || t["contact:website"] || t.url)) { website = t.website || t["contact:website"] || t.url; websiteFrom = "osm"; }
    }
    (await commonsNear(name, lat, lng).catch(() => [])).forEach((c) => out.push(c));
  }
  if (!website && websiteLookup) { website = (await websiteLookup().catch(() => "")) || ""; if (website) websiteFrom = "google"; }
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = "https://" + website;
    (await fromWebsite(website).catch((e) => { notes.push("Website: " + e.message); return []; })).forEach((c) => out.push(c));
  }
  const seen = new Set();
  const candidates = out.filter((c) => c.url && !seen.has(c.url) && seen.add(c.url)).sort((a, b) => b.score - a.score).slice(0, 6);
  return { candidates, website: website || "", websiteFrom, osm: osm ? { id: osm.id, name: osm.tags.name } : null, notes };
}

module.exports = { findPhotos, tokens, matchScore, sameName, coreName, imageSize, shareImages, privateIp, checkUrl };
