#!/usr/bin/env python3
"""Fyndo photo pipeline: finds each place's official links and real photos, the allowed way.

For every place that still has no photo of its own (or whose links were never checked) it:
  1. Finds the place's official website, Facebook page and Instagram account with a free AI that can search
     the web (Gemini with Google Search, or Groq compound), then checks every link before keeping it.
  2. Reads the place's OWN website with Scrapling: the plain fetcher first, a real browser only for pages that
     need JavaScript. It obeys robots.txt, sends an honest bot name, and skips any site that blocks or challenges
     it (no Cloudflare solving, no fake referrer, no fingerprint masking).
  3. Asks a free AI vision model whether each photo really shows the food, drinks, inside or outside of the
     place (not a logo, a text banner or stock art) before adding it, with a credit to the website.
  4. Reads the website's menu page and leaves the items and prices as a suggestion for an admin to check.

It never touches Google Maps, TripAdvisor, Instagram or Facebook pages themselves: their terms forbid it.

Environment:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   database (the service role key bypasses row security: keep it secret)
  GEMINI_API_KEY and/or GROQ_API_KEY        free AI (optional; without them links are not searched and photos
                                            are accepted by size only)
  BROWSER=off                               never start a browser (plain fetcher only)
  REAL_CHROME=1                             use the Chrome installed on this machine instead of Playwright's
  CA_BUNDLE=path.pem                        extra trusted certificates (for PCs whose antivirus inspects HTTPS)

Run locally without a database:  python pipeline.py --spots-file spots.json --dry-run
"""
import argparse
import base64
import ipaddress
import json
import os
import re
import socket
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timedelta, timezone

UA = "FyndoBot/1.0 (+https://github.com/YasasNM/fyndo-app; fyndolk.official@gmail.com)"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_VISION_MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-2.5-flash-lite")
GROQ_SEARCH_MODEL = os.environ.get("GROQ_SEARCH_MODEL", "groq/compound")
GROQ_VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
MAX_NEW_PHOTOS = 4
RECHECK_DAYS = 25

# ---------------------------------------------------------------- names
STOP = set("the and restaurant restaurants cafe caf coffee hotel colombo kandy galle lanka sri bar grill kitchen house food foods "
           "by of at de la le pvt ltd branch shop centre center lk".split())
PLACES = set("mount lavinia dehiwala wellawatta wellawatte bambalapitiya kollupitiya nugegoda rajagiriya battaramulla borella maradana "
             "pettah fort kotte wattala negombo rathmalana ratmalana moratuwa jawatte havelock kotahena colpetty slave island".split())


def norm(s):
    return unicodedata.normalize("NFKD", str(s or "").lower()).encode("ascii", "ignore").decode()


def core_name(s):
    s = re.sub(r"\(.*?\)", " ", str(s or ""))
    return re.split(r"\s[-–|]\s|,", s)[0].strip()


def tokens(s):
    return [t for t in re.split(r"[^a-z0-9]+", norm(core_name(s))) if len(t) >= 3 and t not in STOP and t not in PLACES and not t.isdigit()]


def name_in(name, text):
    """Share of the place name's words that appear in text (0..1). Joined words count too (cafekumbuk)."""
    want = tokens(name)
    if not want:
        return 0.0
    have = norm(text)
    flat = re.sub(r"[^a-z0-9]", "", have)
    return sum(1 for t in want if re.search(r"\b" + re.escape(t) + r"\b", have) or t in flat) / len(want)


# ---------------------------------------------------------------- safe HTTP
def private_host(host):
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return True
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return True
    return False


def safe_url(url):
    try:
        p = urllib.parse.urlparse(url)
    except ValueError:
        return False
    return p.scheme in ("http", "https") and p.hostname and not p.username and (p.port in (None, 80, 443)) and not private_host(p.hostname)


def http_get(url, max_bytes=4_000_000, timeout=20, headers=None, accept="*/*"):
    """GET with our bot name, a size cap and no private-network targets. Returns (status, content_type, bytes, final_url)."""
    if not safe_url(url):
        raise ValueError("address not allowed")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            if not safe_url(r.geturl()):
                raise ValueError("redirected to an address that is not allowed")
            return r.status, r.headers.get("Content-Type", ""), r.read(max_bytes), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", "") if e.headers else "", b"", url


def post_json(url, body, headers=None, timeout=60):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


_robots = {}


def robots_allow(url):
    p = urllib.parse.urlparse(url)
    base = f"{p.scheme}://{p.netloc}"
    rp = _robots.get(base)
    if rp is None:
        rp = urllib.robotparser.RobotFileParser()
        try:
            status, _, body, _ = http_get(base + "/robots.txt", max_bytes=300_000, timeout=10)
            if status in (401, 403):
                rp.parse(["User-agent: *", "Disallow: /"])
            elif status == 200:
                rp.parse(body.decode("utf-8", "ignore").splitlines())
            else:
                rp.parse([])
        except Exception:
            rp.parse([])
        _robots[base] = rp
    return rp.can_fetch("FyndoBot", url)


# ---------------------------------------------------------------- image size from bytes
def image_size(b):
    if len(b) > 24 and b[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
    if len(b) > 4 and b[0] == 0xFF and b[1] == 0xD8:
        i = 2
        while i + 9 < len(b):
            if b[i] != 0xFF:
                i += 1
                continue
            m = b[i + 1]
            if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7:
                i += 2
                continue
            seg = int.from_bytes(b[i + 2:i + 4], "big")
            if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
                return int.from_bytes(b[i + 7:i + 9], "big"), int.from_bytes(b[i + 5:i + 7], "big")
            i += 2 + seg
        return None
    if len(b) > 30 and b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        kind = b[12:16]
        if kind == b"VP8X":
            return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
        if kind == b"VP8 ":
            return int.from_bytes(b[26:28], "little") & 0x3FFF, int.from_bytes(b[28:30], "little") & 0x3FFF
        if kind == b"VP8L":
            v = int.from_bytes(b[21:25], "little")
            return 1 + (v & 0x3FFF), 1 + ((v >> 14) & 0x3FFF)
    return None


# ---------------------------------------------------------------- pages with Scrapling
BLOCK_MARKERS = ("cf-chl", "Just a moment...", "Attention Required!", "captcha", "Access denied")


def fetch_page(url, allow_browser=True):
    """Returns a Scrapling page or None. Plain fetch first; a real browser only when the page needs JavaScript."""
    if not safe_url(url) or not robots_allow(url):
        return None, "robots.txt or address does not allow it"
    from scrapling.fetchers import Fetcher
    try:
        extra = {"verify": os.environ["CA_BUNDLE"]} if os.environ.get("CA_BUNDLE") else {}
        page = Fetcher.get(url, headers={"User-Agent": UA}, stealthy_headers=False, timeout=25, follow_redirects=True, retries=1, **extra)
    except Exception as e:  # network error, TLS error...
        return None, f"fetch failed ({type(e).__name__})"
    html_text = page.html_content if hasattr(page, "html_content") else str(page)
    if page.status in (401, 403, 429, 503) or any(m in html_text[:20000] for m in BLOCK_MARKERS):
        return None, f"site blocks automated visitors (HTTP {page.status}); skipped"
    if page.status >= 400:
        return None, f"HTTP {page.status}"
    needs_js = len(page.css("img")) < 2 and len(page.get_all_text(ignore_tags=("script", "style")).strip()) < 400
    if needs_js and allow_browser and os.environ.get("BROWSER", "") != "off":
        try:
            from scrapling.fetchers import StealthyFetcher
            # Only to run the page's JavaScript: no Cloudflare solving, no fake Google referrer, no canvas noise.
            page2 = StealthyFetcher.fetch(url, headless=True, solve_cloudflare=False, google_search=False, hide_canvas=False,
                                          useragent=UA, block_ads=True, network_idle=True, timeout=35000,
                                          real_chrome=os.environ.get("REAL_CHROME") == "1")
            html2 = page2.html_content if hasattr(page2, "html_content") else str(page2)
            if page2.status < 400 and not any(m in html2[:20000] for m in BLOCK_MARKERS):
                return page2, "rendered with a browser"
        except Exception as e:
            return page, f"browser unavailable ({type(e).__name__}); used the plain page"
    return page, "ok"


def attr_all(page, selector, attr):
    out = []
    for el in page.css(selector):
        v = el.attrib.get(attr)
        if v:
            out.append(v)
    return out


SKIP_IMG = re.compile(r"logo|icon|favicon|sprite|placeholder|avatar|badge|payment|flag|pixel|spacer|loader|blank|\.svg|\.gif", re.I)


def image_candidates(page):
    base = getattr(page, "url", "") or ""
    raw = attr_all(page, 'meta[property="og:image"]', "content") + attr_all(page, 'meta[property="og:image:secure_url"]', "content") \
        + attr_all(page, 'meta[name="twitter:image"]', "content")
    og_count = len(raw)
    for sel, attr in (("img", "src"), ("img", "data-src"), ("img", "data-lazy-src"), ("img", "data-original")):
        raw += attr_all(page, sel, attr)
    for sel in ("img", "source"):
        for srcset in attr_all(page, sel, "srcset") + attr_all(page, sel, "data-srcset"):
            parts = [p.strip().split(" ") for p in srcset.split(",") if p.strip()]
            if parts:
                raw.append(parts[-1][0])  # the last entry is usually the largest
    out, seen = [], set()
    for i, src in enumerate(raw):
        src = src.replace("&amp;", "&").strip()
        if not src or src.startswith("data:") or SKIP_IMG.search(src):
            continue
        url = urllib.parse.urljoin(base, src)
        if not url.startswith("https://") or url in seen:
            continue
        seen.add(url)
        out.append({"url": url, "og": i < og_count})
    return out[:24]


def measure(cands, page_url, limit=8):
    """Download candidates (capped) and keep real photos: at least 600x400, not a strip or a tower."""
    kept = []
    for c in cands:
        if len(kept) >= limit:
            break
        try:
            status, ctype, body, final = http_get(c["url"], max_bytes=4_000_000, timeout=20, accept="image/*", headers={"Referer": page_url})
        except Exception:
            continue
        if status != 200 or not re.match(r"image/(jpeg|png|webp)", ctype or ""):
            continue
        size = image_size(body)
        if not size:
            continue
        w, h = size
        if w < 600 or h < 400 or not (0.6 <= w / h <= 2.4):
            continue
        kept.append({**c, "url": final, "w": w, "h": h, "bytes": body, "mime": ctype.split(";")[0]})
    kept.sort(key=lambda c: (not c["og"], -(c["w"] * c["h"])))
    return kept


# ---------------------------------------------------------------- free AI
def extract_json(text):
    m = re.search(r"\{[\s\S]*\}", text or "")
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def gemini(model, parts, tools=None, json_out=False):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    body = {"contents": [{"parts": parts}], "generationConfig": {"temperature": 0}}
    if tools:
        body["tools"] = tools
    if json_out:
        body["generationConfig"]["responseMimeType"] = "application/json"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={urllib.parse.quote(key)}"
    try:
        r = post_json(url, body)
    except Exception as e:
        print(f"    gemini: {type(e).__name__}")
        return None
    cand = (r.get("candidates") or [{}])[0]
    text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []))
    return text


def groq(model, messages, json_out=False):
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        return None
    body = {"model": model, "messages": messages, "temperature": 0}
    if json_out:
        body["response_format"] = {"type": "json_object"}
    try:
        r = post_json("https://api.groq.com/openai/v1/chat/completions", body, headers={"Authorization": f"Bearer {key}"})
    except Exception as e:
        print(f"    groq: {type(e).__name__}")
        return None
    return ((r.get("choices") or [{}])[0].get("message") or {}).get("content", "")


def ai_available():
    return bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GROQ_API_KEY"))


DIRECTORY = re.compile(r"(tripadvisor|zomato|google|goo\.gl|ubereats|pickme|yamu|foursquare|yelp|wikipedia|booking\.com|agoda|"
                       r"facebook|instagram|tiktok|twitter|x\.com|linkedin|youtube|wa\.me|linktr)", re.I)


def find_links(spot):
    """Ask a web-searching AI for the official links, then keep only the ones that check out."""
    prompt = (f'Find the official online presence of this exact place in Sri Lanka: "{spot["name"]}", {spot.get("area", "")}, '
              f'a {spot.get("category", "place")}. Search the web. Reply with JSON only: '
              '{"website": "", "facebook": "", "instagram": ""}. Leave a value empty unless you are sure it is the '
              "place's own official site or account (not a directory, delivery app, review site, news article or another branch).")
    text = gemini(GEMINI_MODEL, [{"text": prompt}], tools=[{"google_search": {}}])
    if not text:
        text = groq(GROQ_SEARCH_MODEL, [{"role": "user", "content": prompt}])
    data = extract_json(text) or {}
    out = {}
    site = str(data.get("website") or "").strip()
    if site:
        if not re.match(r"^https?://", site):
            site = "https://" + site
        host = urllib.parse.urlparse(site).hostname or ""
        if host and not DIRECTORY.search(host):
            page, why = fetch_page(site, allow_browser=False)
            if page is not None:
                text_all = page.get_all_text(ignore_tags=("script", "style")) + " " + host
                title = " ".join(t.get_all_text() for t in page.css("title"))
                if name_in(spot["name"], text_all + " " + title) >= 0.5:
                    out["website"] = getattr(page, "url", site) or site
    fb = str(data.get("facebook") or "").strip()
    m = re.match(r"^https?://(?:www\.|m\.|web\.)?facebook\.com/([A-Za-z0-9.\-_]{3,80})/?$", fb)
    if m and m.group(1).lower() not in ("sharer", "groups", "events", "share", "login", "watch", "people", "profile.php", "pages") \
            and name_in(spot["name"], m.group(1)) >= 0.5:
        out["facebook"] = f"https://www.facebook.com/{m.group(1)}"
    ig = str(data.get("instagram") or "").strip()
    m = re.match(r"^https?://(?:www\.)?instagram\.com/([A-Za-z0-9._]{2,30})/?$", ig)
    if m and m.group(1).lower() not in ("p", "reel", "explore", "accounts", "stories") and name_in(spot["name"], m.group(1)) >= 0.5:
        out["instagram"] = f"https://www.instagram.com/{m.group(1)}/"
    return out


VISION_PROMPT = ("You check photos for a restaurant and going-out guide in Sri Lanka. This image comes from the website of "
                 '"{name}" ({category}, {area}). Reply with JSON only: {{"kind": "food|drink|interior|exterior|menu|logo|people|text|stock|other", '
                 '"ok": true or false, "reason": "a few words"}}. ok is true only if it shows food, drinks, the inside or the outside '
                 "of a place like this and would help a visitor decide. ok is false for logos, text banners, menus, posters, portraits, "
                 "collages, maps and generic stock art.")


def vision_ok(spot, cand):
    """True/False from a free vision model, or None when no AI is available or it failed."""
    prompt = VISION_PROMPT.format(name=spot["name"], category=spot.get("category", ""), area=spot.get("area", ""))
    b64 = base64.b64encode(cand["bytes"][:3_500_000]).decode()
    text = gemini(GEMINI_VISION_MODEL, [{"inline_data": {"mime_type": cand["mime"], "data": b64}}, {"text": prompt}], json_out=True)
    if not text:
        text = groq(GROQ_VISION_MODEL, [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{cand['mime']};base64,{b64}"}}]}], json_out=True)
    data = extract_json(text)
    if not data or "ok" not in data:
        return None, ""
    return bool(data["ok"]) and data.get("kind") in ("food", "drink", "interior", "exterior"), f'{data.get("kind", "?")}: {data.get("reason", "")}'


MENU_PROMPT = ("This is the text of the menu page of \"{name}\", a {category} in Sri Lanka. List the dishes and drinks that have a "
               'price written next to them. Reply with JSON only: {{"items": [{{"item": "name", "price": 850}}], '
               '"price_min": null, "price_max": null}}. Prices are numbers in LKR (Rs). Only copy prices that are written on the '
               "page; never guess. price_min and price_max are a typical spend per person if the page makes it clear, else null. "
               "At most 40 items.\n\nPAGE TEXT:\n{text}")


def menu_suggestion(spot, page):
    """Find the menu page on the place's own site and extract priced items for an admin to check."""
    if not ai_available():
        return None
    base_host = urllib.parse.urlparse(page.url).hostname
    target = None
    for a in page.css("a"):
        href = a.attrib.get("href", "")
        label = (a.get_all_text() or "") + " " + href
        if re.search(r"\bmenu\b", label, re.I):
            url = urllib.parse.urljoin(page.url, href)
            if urllib.parse.urlparse(url).hostname == base_host and not re.search(r"\.(pdf|jpg|png)$", url, re.I):
                target = url
                break
    menu_page = page
    if target:
        p2, _ = fetch_page(target)
        if p2 is not None:
            menu_page = p2
    text = menu_page.get_all_text(ignore_tags=("script", "style"))
    if not re.search(r"(rs\.?|lkr)\s?\d|\d{3,5}(\.00)?\b", text, re.I):
        return None
    prompt = MENU_PROMPT.format(name=spot["name"], category=spot.get("category", ""), text=text[:14000])
    out = gemini(GEMINI_VISION_MODEL, [{"text": prompt}], json_out=True) or groq("llama-3.3-70b-versatile", [{"role": "user", "content": prompt}], json_out=True)
    data = extract_json(out) or {}
    items = [{"item": str(i.get("item", ""))[:80], "price": int(float(i.get("price")))} for i in (data.get("items") or [])
             if i.get("item") and isinstance(i.get("price"), (int, float)) and 50 <= float(i.get("price")) <= 100000][:40]
    if len(items) < 3:
        return None
    return {"items": items, "price_min": data.get("price_min"), "price_max": data.get("price_max"), "source_url": menu_page.url}


# ---------------------------------------------------------------- database
class Supabase:
    def __init__(self, url, key):
        self.url, self.key = url.rstrip("/"), key

    def _req(self, method, path, body=None, prefer=None):
        headers = {"apikey": self.key, "Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        req = urllib.request.Request(self.url + path, method=method, headers=headers,
                                     data=json.dumps(body).encode() if body is not None else None)
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else None

    def spots_to_check(self, limit, only=None):
        cols = "id,name,area,category,website,facebook_url,instagram_url,photos,photo_info,links_checked_at,photos_checked_at"
        if only:
            q = f"id=eq.{urllib.parse.quote(only)}"
        else:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=RECHECK_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
            q = (f"and=(or(photos.eq.{{}},links_checked_at.is.null),or(photos_checked_at.is.null,photos_checked_at.lt.{cutoff}))"
                 f"&order=photos_checked_at.asc.nullsfirst&limit={int(limit)}")
        return self._req("GET", f"/rest/v1/spots?select={cols}&{q}")

    def update_spot(self, spot_id, patch):
        self._req("PATCH", f"/rest/v1/spots?id=eq.{urllib.parse.quote(spot_id)}", patch, prefer="return=minimal")

    def add_suggestion(self, row):
        self._req("POST", "/rest/v1/spot_suggestions", row, prefer="return=minimal")


# ---------------------------------------------------------------- one place
def process(spot, log):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    patch = {"links_checked_at": now, "photos_checked_at": now}
    note = []
    # 1. links
    if ai_available() and not (spot.get("website") and spot.get("facebook_url") and spot.get("instagram_url")):
        links = find_links(spot)
        if links.get("website") and not spot.get("website"):
            patch["website"] = links["website"]
        if links.get("facebook") and not spot.get("facebook_url"):
            patch["facebook_url"] = links["facebook"]
        if links.get("instagram") and not spot.get("instagram_url"):
            patch["instagram_url"] = links["instagram"]
        if links:
            note.append("links: " + ", ".join(k for k in links))
    website = patch.get("website") or spot.get("website") or ""
    suggestion = None
    # 2-3. photos from the place's own website
    existing = list(spot.get("photos") or [])
    if website and len(existing) < 2:
        page, why = fetch_page(website)
        if page is None:
            note.append(f"website: {why}")
        else:
            cands = measure(image_candidates(page), page.url)
            accepted, info = [], dict(spot.get("photo_info") or {})
            host = (urllib.parse.urlparse(page.url).hostname or "").removeprefix("www.")
            for c in cands:
                if len(accepted) >= MAX_NEW_PHOTOS:
                    break
                if c["url"] in existing:
                    continue
                ok, reason = vision_ok(spot, c)
                if ok is None:  # no AI: keep the share image and the largest photo only
                    ok, reason = (c["og"] or not accepted) and len(accepted) < 2, "size check only"
                log(f"    {'keep' if ok else 'drop'} {c['w']}x{c['h']} {c['url'][:80]} ({reason})")
                if ok:
                    accepted.append(c["url"])
                    info[c["url"]] = {"source": "website", "credit": host, "link": page.url, "checked": "ai" if reason != "size check only" else "size"}
            if accepted:
                patch["photos"] = (existing + accepted)[:12]
                patch["photo_info"] = info
                note.append(f"photos: +{len(accepted)}")
            else:
                note.append(f"photos: none usable ({why})")
            # 4. menu and prices for an admin to check
            try:
                suggestion = menu_suggestion(spot, page)
            except Exception as e:
                log(f"    menu: {type(e).__name__}")
            if suggestion:
                note.append(f"menu: {len(suggestion['items'])} priced items suggested")
    elif not website:
        note.append("no official website found")
    return patch, suggestion, "; ".join(note) or "nothing new"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=int(os.environ.get("LIMIT", "25")))
    ap.add_argument("--only", help="process one place id")
    ap.add_argument("--dry-run", action="store_true", help="print what would change, write nothing")
    ap.add_argument("--spots-file", help="read places from a JSON file instead of Supabase (implies --dry-run)")
    args = ap.parse_args()

    db = None
    if args.spots_file:
        with open(args.spots_file, encoding="utf-8") as f:
            spots = json.load(f)[: args.limit]
        args.dry_run = True
    else:
        url, key = os.environ.get("SUPABASE_URL", "").strip(), os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not url or not key:
            sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use --spots-file for a local test).")
        db = Supabase(url, key)
        spots = db.spots_to_check(args.limit, args.only)

    print(f"Checking {len(spots)} place(s). AI: {'on' if ai_available() else 'off (size check only, no link search)'}."
          f" Browser: {'off' if os.environ.get('BROWSER') == 'off' else 'on when a page needs it'}.")
    report = ["| Place | Result |", "|---|---|"]
    for i, spot in enumerate(spots, 1):
        print(f"[{i}/{len(spots)}] {spot['name']}")
        try:
            patch, suggestion, summary = process(spot, print)
        except Exception as e:
            patch, suggestion, summary = None, None, f"error: {type(e).__name__}: {e}"
        print(f"    -> {summary}")
        report.append(f"| {spot['name']} | {summary} |")
        if not args.dry_run and patch:
            try:
                db.update_spot(spot["id"], patch)
                if suggestion:
                    db.add_suggestion({"spot_id": spot["id"], "kind": "menu", "data": {k: v for k, v in suggestion.items() if k != "source_url"},
                                       "source_url": suggestion["source_url"]})
            except urllib.error.HTTPError as e:
                print(f"    database: HTTP {e.code} {e.read().decode()[:200]}")
        elif args.dry_run and patch:
            shown = {k: (v if k != "photo_info" else f"{len(v)} entries") for k, v in patch.items()}
            print("    would save:", json.dumps(shown)[:600])
        time.sleep(1.5)  # be polite to the sites and the free AI limits
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as f:
            f.write("## Fyndo photo pipeline\n\n" + "\n".join(report) + "\n")


if __name__ == "__main__":
    main()
