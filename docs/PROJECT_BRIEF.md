# Fyndo: project brief and handover

> **For an AI assistant reading this:** this file is the complete context for the Fyndo project as of **17 November 2026**. It explains what Fyndo is, how it is built, what has been done, the rules the owner has set, and what comes next (purchases, launch, growth). Treat it as the source of truth. It contains no passwords or keys. Never ask for keys to be pasted into a chat.

---

## 1. What Fyndo is

**Fyndo ("Find the real spots")** is a mobile-first web app (installable as a phone app, PWA) for finding places to eat and things to do in **Sri Lanka**, starting in **Colombo 3, 4, 5, 7, Dehiwala and Mount Lavinia**.

The promise: someone opens Fyndo undecided and leaves with a place, a price they trust, and directions or a booking, in about a minute.

**Users (weighted equally)**
- Young locals in Colombo (students, young professionals, couples) deciding where to go tonight, on a phone.
- Families and groups planning an occasion (birthday, anniversary) a few days ahead, comparing prices, booking.
- Tourists who want real local places, honest prices (LKR with a USD view) and directions.
- Working roles: **restaurant owners** (claim and manage their page on a yearly plan) and the **Fyndo admin**.

**What makes it different**
1. Real look and real prices: what a place looks like and costs per person.
2. Plans the whole outing: mood + budget + occasion become a night (dinner, dessert, sunset).
3. Local hidden gems: small verified spots big apps bury (kottu, short eats, cafés).
4. Rewards and booking: QR check-ins, stamp cards, points, table booking, owner replies.

**Business contact:** fyndolk.official@gmail.com
**Live site (temporary address):** https://ambitious-smoke-03a183e00.6.azurestaticapps.net
**Code:** GitHub `YasasNM/fyndo-app` (private), branch `main`, auto-deploys on push.
**Stage today:** built, security-hardened and QA-checked, not yet launched to the public. **Not complete until Google Places has a working budget** (section 7a). No real users, testimonials or press yet. Never invent any.

---

## 2. Owner's standing rules (follow these)

1. **Everything free where possible.** Pay only when a clear trigger is reached (see section 7).
2. **Never remove features.** Simplify by splitting into clearer pages, not by deleting.
3. **Minimal design, simple buttons, plain friendly English,** sentence case, no hype. Many users read English as a second language.
4. **Production-ready for thousands of users.**
5. **Security:**
   - Keys never go in code, chats or GitHub files.
   - Only the publishable (anon) Supabase key may be in the browser.
   - The Supabase service role key lives only in GitHub Actions secrets.
   - Server keys (Google, AI) live only in Azure environment settings.
6. **No scraping** of Google Maps, TripAdvisor, Instagram or Facebook content (this includes Apify-style scrapers). A Google Maps scrape exists locally in `Res data/` (215 restaurants, about 17,900 reviews with reviewer personal data). It is git-ignored and must **not** be imported. The only safe use is its Google **place IDs**, which can be linked through the official API.
7. **Google rules:** store only the Google **place ID**. Rating, hours, photos and reviews are fetched live and shown with Google attribution. Never keep Google photos, and never write AI summaries of Google reviews.
8. **Privacy:** no ads, no tracking, no analytics tools, never sell data. If analytics are ever added, update `/privacy` first.
9. Keep the name **Fyndo** and the map-pin logo. Colours and fonts may change.

---

## 3. Technology

| Layer | Technology | Plan / cost today |
|---|---|---|
| Website | **Next.js 15** (App Router), **React 19**, static export to `out/` | — |
| Hosting | **Azure Static Web Apps**, Free plan, region East Asia | LKR 0 |
| Server functions | Azure SWA managed **Functions**, Node 20, v3 model, no npm dependencies (`api/`) | included |
| Database, login, file storage | **Supabase** (Postgres + Row Level Security, Auth, Storage), region Singapore | Free plan |
| Maps | **Leaflet** + OpenStreetMap tiles; directions open Google Maps | free |
| Live place info | **Google Places API (New)**, server-side only, with daily quota caps. **A required part of the product** (see section 7a) | free monthly allowance, then pay per call |
| AI (Ask Fyndo, plan tuning, Help me choose) | Groq → Cerebras → Gemini → OpenRouter → Azure OpenAI, tried in order; keyword fallback if all fail | free tiers / student credit |
| Bot check | **Cloudflare Turnstile** (code ready, off until keys are set) | free |
| Email | Supabase Auth through Gmail SMTP (to be replaced, see section 7) | free |
| Weekly photo job | Python (`tools/photo-pipeline/`, Scrapling), run by **GitHub Actions** every Sunday | free |
| Other free APIs | Open-Meteo (weather, sunset), ExchangeRate-API (USD rate), Google Fonts | free |
| Deploy | GitHub Actions: `.github/workflows/azure-static-web-apps.yml` | free |
| Updates | Dependabot weekly (`.github/dependabot.yml`) | free |

**Demo mode:** without Supabase settings, the app runs on built-in sample data (`lib/demo.js`), with one-tap demo logins for user, owner and admin.

### Folder map
```
app/            pages: home, plan, spot, book, saved, me, login, reset-password, dashboard (owner),
                admin, claim, checkin, rewards, compare, vote, split, watch (reels), feed (friends),
                profile, u (public profile), list, credits, privacy, terms
components/     UI pieces (AskFyndo, GooglePanel, SpotCard, SpotMap, ReviewsPanel, Captcha, Admin*, ...)
lib/            data layer (data.js chooses demo.js or live.js), planner, AI fallback (askLocal),
                config (owner fee etc.), photos and credits, weather, rates, sun times
api/            Azure functions: ask, plan-ai, decide, place, photo, cover, places-search,
                places-discover, photo-finder, health; shared/ (util: rate limits, admin check; google)
supabase/       schema.sql, then schema_v3.sql … schema_v9.sql (run in order); seed_google.sql (177 real places)
tools/          photo-pipeline (weekly job)
public/         icons, manifest, service worker, staticwebapp.config.json (routes + security headers),
                img/ and video/ (openly licensed, credited on /credits)
PRODUCT.md      product context;  DESIGN.md  visual system;  README.md  full setup guide
```

### Design
- **Visual theme:** "Black lacquer" (November 2026): an Uber- and Letterboxd-inspired luxury look. Black and white, a black-to-emerald lacquer gradient on main buttons, the active page and planned stops, Phosphor icons with a gem colour per feature (emerald, sapphire, ruby, topaz, amethyst, moonstone) shown as small tiles, gold only for ratings, and premium motion (headline words rise, photos develop, button sheen, theme circle). Light, dark, or follow the phone. One font: **Geist**. Tokens at the top of `app/globals.css`; full rules in `DESIGN.md`.
- **Imagery:** calm photo hero with real, credited photography and no AI-generated imagery.
- **Accessibility:** 44px touch targets, strong contrast in light and dark mode, and reduced motion respected.
- **Reference:** full tokens are in `DESIGN.md`.

---

## 4. Features (all must survive any redesign)

**Visitors**
- **Search and Ask Fyndo:** free AI that turns a sentence into filters and answers only from Fyndo's own places, plus moods, occasions and filters (area, budget, type, open now, can book).
- **Views:** list and map.
- **Today's deals:** a row on Home of the offers places are running today (on now first, then later today), and a deal card on the place page. Owners set one deal per place in the Business dashboard's Deals tab: title, details, days, hours and an end date. Needs `schema_v9.sql`.
- **Planning:** Plan a date or night within a budget, AI-tuned but checked on the server; Compare, with AI "Help me choose"; group vote; bill split.
- **Place pages:**
  - photos, gallery, video, menu and prices
  - official links and social embeds (loaded only when tapped)
  - live Google info and reviews (on tap)
  - Fyndo reviews with owner replies
  - visitor photos, approved by an admin
- **Account:** saves, plans, table booking (instant or request) with cancel, QR check-ins, rewards and badges.
- **Social:** profiles with @username and Top 4, a private profile option, follow friends, a friends feed, likes, lists, and story-image sharing. There is no chat.
- **Watch (reels), installable app, dark mode, first-run tour.**
- **Legal and credits:** Credits, Privacy policy, Terms.

**Restaurant owners**
- **Claiming:** claim a page with proof, then pay **LKR 5,000 / 12 months** by bank transfer. The proof and receipt are kept private. If the claim is rejected, the fee is refunded.
- **Business dashboard:** bookings, booking settings, menu, page edits, replies to reviews, and renewal.

**Admin**
- **Places:** add places using "Find on Google" (place ID only), verify places, set owners, and bulk-link places to Google.
- **Requests:** owner claims, visitor photos, menu suggestions, reports and moderation.
- **Tools:** a free real-photo finder (OpenStreetMap, Wikimedia, the place's own website).

---

## 5. History (what has been done, in order)

| Commit | What changed |
|---|---|
| `cd2d083` → `495f8db` | First version: reviews, ratings, sorting, near me, popular, sharing, dark mode. |
| `38cf9f5`, `b943243` | Free maps; rewards, QR check-in, verified reviews, group vote, bill split, compare, collections, weather, owner tools. |
| `0e068df` → `145516f` | Redesign with SVG icons; photo gallery, route map; Gemini; admin Google tools; plain-English Google errors. |
| `ca491a2` → `899b4f2` | Simpler UI (5-tab nav, tour); real Colombo places; live USD rate and sunset; Leaflet instead of Google Maps tiles; Fyndo photo uploads; Google info only on tap. |
| `63cb207` | Production: email verification, password reset and change, 177 real places, credited real photos, free AI providers with fallback. |
| `ddb1711`, `19bbeb4` | Photo-led place cards; owner claims; real-photo finder; quieter Google limits. |
| `f3526f8`, `b8b9147` | Bus-board theme; weekly photo job, official links and embeds, visitor photos. |
| `787d0e7`, `2ee582a`, `ba09608` | AI plan tuning and Help me choose; social layer; green shell; calm photo hero; schema v7. |
| `c6072f7` | **Security hardening.** See below. |
| next commit | **Full QA pass and fixes, logout confirmation.** See below. |

**Security hardening, commit `c6072f7`:**
- **Browser protections:** Content Security Policy, HSTS, `X-Frame-Options: DENY`, Permissions-Policy and nosniff. Unused Azure login providers are blocked.
- **Login:**
  - Optional Turnstile bot check on log in, sign up, password reset and resend.
  - Open redirect after login fixed.
  - Safer people search.
- **Server rate limits:** keyed on Azure's real client IP, plus an overall per-function cap.
- **`schema_v8.sql`:**
  - Private profiles' reviews can't be listed by account.
  - The raw reviews table is readable only by its owner or an admin.
  - Place links and photos must be `http(s)` addresses.
  - Profile photos must come from Fyndo's storage.
  - Daily spam limits: reviews 30, reports 15, follows 150, likes 400, feedback 10, claims 5, votes 20, 100 lists in total, 500 answers per vote.
- **New pages:** `/privacy` and `/terms`, under Sri Lanka's Personal Data Protection Act No. 9 of 2022, with users aged 13+.
- **Repo:** Dependabot, and a README security checklist.
- **Raw data:** `Res data/` is git-ignored.

**Full QA pass (17 Nov 2026):**
- **Coverage:** every page as visitor, user, owner and admin, on phone and desktop sizes (328 visits). Also tested:
  - broken, empty and hostile links
  - browser storage blocked
  - every server function fuzzed with missing keys, bad input and network failure
  - a read-only check of the live site
- **Fixed:**
  - empty and not-found screens had no page heading
  - `/u/` with no name showed "@"
  - Google and Supabase network failures returned raw "fetch failed" text and could hang without a timeout
  - the admin check could crash if Supabase dropped mid-request
  - logging out now asks first
- **Live findings:**
  - no CSP violations and no script errors
  - security headers active
  - Google daily caps used up, and no AI key set (both in section 6)

**Testing:**
- About 214 automated browser checks over 10 suites, plus a CSP test across 16 pages.
- Unit tests for server functions.
- All pass as of commit `c6072f7`.
- The test scripts live outside the repo, in a temporary folder. If they are lost, recreate them with puppeteer against `out/`.

---

## 6. Open to-do list (owner actions, not code)

**Security checklist (from the README)**
- [ ] Run `supabase/schema_v8.sql`, then `supabase/schema_v9.sql` (Today's deals), in the Supabase SQL Editor (v3–v7 already run). Until v9 runs, the deals row stays hidden and the Deals tab asks for it.
- [ ] Rotate the Google Maps key and the Gmail app password; both were exposed in an earlier chat.
- [ ] Turn on 2-step sign-in for Supabase, GitHub, Azure, Google Cloud and the Fyndo Gmail account.
- [ ] Supabase Auth: minimum password length 8, secure email change and secure password change on, rate limits not raised.
- [ ] GitHub: Dependabot alerts, security updates and secret scanning on.
- [ ] Back up the database weekly until Supabase Pro.
- [ ] **Google daily limits are used up with almost no visitors** (seen on the live site, 17 Nov 2026). Follow section 7a: raise the caps to a budget, and turn off Google card photos.
- [ ] **No AI key is set in Azure** (`/api/health` shows `"ai": null`), so Ask Fyndo, plan tuning and Help me choose run on keyword matching only. Add a free `GROQ_API_KEY`, and optionally `CEREBRAS_API_KEY`, in Azure > Environment variables.
- [ ] Turnstile: add the site key as the GitHub secret `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Only after that build is live, turn on CAPTCHA in Supabase with the secret key.

**Data**
- [ ] Walk through the 177 seeded places: fix hours and prices, and remove closed places.
- [ ] Optionally, link more places using place IDs through the official API. An "import by place ID" admin screen is a possible next build.

---

## 7. Purchases: what to buy and when

**Rule:** buy only when the trigger is reached. Prices are approximate (late 2026, about LKR 300 per USD); check before paying.

### Before launch (planned for December 2026)
| Item | Cost | Notes |
|---|---|---|
| **Domain `fyndo.lk`** from the official LK Domain Registry (register.domains.lk) | **LKR 8,000 for 2 years** (Standard package promo; includes `fyndo.lk`, `fyndo.com.lk` and related names) | Untick "MyPage" at checkout. Register in the owner's own name, with an email kept for years. Renewal will likely cost more, around LKR 15,200 for 2 years for Standard, or LKR 9,500 for 2 years for just `fyndo.lk`. |
| Cloudflare (DNS, email forwarding to `hello@fyndo.lk`, Turnstile) | free | Point the domain's nameservers to Cloudflare. |
| Transactional email sender (Resend or Brevo) on the domain | free tier | Replaces Gmail SMTP, which has low daily limits and lands in spam. Set up SPF and DKIM. |
| A mailbox at the domain (optional) | free (Zoho free tier) to about $6/month (Google Workspace) | Only if you want to *send* as `hello@fyndo.lk`. Forwarding alone is free. |
| **Google Maps Platform budget (required)** | about $20–50/month for the beta, about $100–300/month at public launch | A card must be on file. See section 7a: card photos off, caps set to the budget, budget alert. |

**After buying the domain, set things up in this order:**
1. Cloudflare DNS.
2. Azure Static Web App > Custom domains (`www.fyndo.lk` and `fyndo.lk`; free HTTPS).
3. Supabase Auth > URL Configuration (Site URL and Redirect URLs).
4. Supabase SMTP settings, pointed at the new sender.
5. Turnstile widget for the new domain.
6. README and contact links.

No code change is needed for the domain itself: the site uses relative paths, and the CSP allows `'self'`.

### Before the public launch
| Item | Trigger | Cost |
|---|---|---|
| **Supabase Pro** | Before strangers' data goes in (public launch). The free plan has no backups and pauses when idle. | about $25/month |
| Business registration in Sri Lanka (sole proprietorship or company) | Before taking owner payments at scale, opening a business bank account, or using a payment gateway | small one-time fee; check with the Divisional Secretariat or the Registrar of Companies |
| Printed QR table stands for partner restaurants | Closed beta | small |

### Later, on triggers
| Item | Trigger | Cost |
|---|---|---|
| Raise the Google budget | Caps hit before the evening rush, as shown in the Google Cloud quota page | in steps of about $50/month |
| Azure SWA Standard | Bandwidth near 100 GB/month, or staging and an SLA needed | about $9/month |
| Paid AI tier | Free AI tiers rate-limit in busy evenings | pay per use |
| Card payments (PayHere or a similar local gateway) | Enough owners that bank transfers become slow | per-transaction fee |
| Google Play developer account | Native wrapper wanted, after retention is proven | $25 one-time |
| Apple developer account | Same | $99/year |
| Paid ads (Meta, Colombo, ages 18–35) | Only after free channels show which message works | small test budget |

**Note:** Azure for Students credit ($100) covers Azure OpenAI and expires after 12 months. Hosting itself is on the Free plan and doesn't use the credit.

---

## 7a. Google Maps Platform: a required part of Fyndo

Without Google, Fyndo shows only its own data: a price range, moods, a menu (if added) and credited or example photos. Visitors expect a place app to show **live ratings, opening hours, phone, website, photos and reviews**, and only Google has these for most Colombo places. **Treat Google as a core, paid service, not an extra.** Every screen still works when Google is off or over its limit, but the product is only complete with it on.

### What Fyndo asks Google for
All calls go through Fyndo's server; the key is never in the browser.

| Where | Google request | Price group (Places API New) | When it happens |
|---|---|---|---|
| Place page | Place Details with rating, hours, phone, website and photo names | **Enterprise** | When a place page opens. Cached 30 minutes per server copy |
| Place page, "Show Google reviews" | Place Details with reviews | **Enterprise + Atmosphere** | Only when the visitor taps |
| Place page photos | Place Photo (media) | **Photos** | One per photo shown (up to 6) |
| Home and list cards with no Fyndo photo | Place Details (photos only), then Place Photo | **Pro** + **Photos** | Two calls per card. Cached 50 minutes per server copy. **This is the biggest cost.** |
| Admin: Find on Google, Discover | Text Search, Nearby Search | **Pro** | Admins only, rare |

### Prices
These are the late-2025 list prices; **always check the Places API pricing page before deciding.**
- **Free each month, per price group:** about 10,000 Essentials, 5,000 Pro and 1,000 Enterprise calls. Photos are counted on their own.
- **After the free amount, roughly, per 1,000 calls:**
  - Pro about $17
  - Enterprise about $20
  - Enterprise + Atmosphere about $25
  - Photos about $7
  - Text or Nearby Search about $32
- A new Google Cloud account may have trial credit (historically $300 for 90 days). Check the billing page.

### Rough monthly cost
These are estimates to plan with; real bills depend on traffic.

| Stage | Place page views a day | Card photos from Google ON | Card photos from Google OFF |
|---|---|---|---|
| Closed beta (about 100 testers) | about 100–200 | about $150–400 | **about $0–60** |
| Public launch, Colombo (about 1,000 users a day) | about 2,000 | $1,000+ | **about $300–700** |

### How to keep Google affordable
Apply these in order.
1. **Turn off Google card photos:** set `GOOGLE_CARD_PHOTOS=off` in Azure. Cards then use Fyndo's own photos (owner and admin uploads, the weekly photo job, credited open photos) or labelled example photos, and Google photos still show on the place page. This removes the biggest cost with little loss.
2. **Fill Fyndo's own photos and hours first.** Every place with its own photo and hours depends less on Google.
3. **Set daily caps to match the budget, not the free amount.** A cap of "free monthly amount ÷ 30" runs out after a handful of visitors; that is what happened on 17 Nov 2026.
   - Example for a $50/month budget: GetPlace about 120 a day and GetPhotoMedia about 150 a day.
   - Set a **billing budget alert** at the same amount.
4. **Possible code change, if costs grow:** load the Enterprise details only when a visitor taps "Google info". The page would then open with Fyndo's own info, which roughly halves the details calls.
5. **Never** store or copy Google content to save money. Only place IDs may be kept.

### Compliance note
Google's terms allow storing **place IDs** indefinitely. Other content must not be pre-fetched or stored.
- **Fyndo's memory caches** (30 minutes for details, 50 minutes for card photo addresses) are short-lived, in memory only, and exist to protect quota. Review them against the current Places API policies before public launch, and shorten or remove them if required. Turning off card photos removes the 50-minute one.
- **What stays in place:** Fyndo always shows the Google Maps attribution, photo and review authors, and links back to Google Maps.

### Budget plan
- **Phase 0 and beta:** Google on, card photos off, caps set for about **$20–50/month**.
- **Public launch:** budget **about $100–300/month to start**, reviewed weekly against the Google Cloud billing report.
- **Funding:** owner plans should cover this. At LKR 5,000 a year per owner, about 20–60 paying owners pay for Google, Supabase and the domain together.

---

## 8. Launch strategy

**Principle:** win one small area first, prove people come back, then spend. A rich map of one area beats a thin map of five cities.

### Phase 0: ready to launch (December 2026, about 2 weeks)
1. Buy the domain and finish the setup order in section 7.
2. Set up Google properly (section 7a): card photos off, caps and budget alert set, and check that a place page shows live info in the evening.
3. Add a free AI key in Azure, so Ask Fyndo uses AI instead of keyword matching.
4. Finish the security checklist (section 6).
5. Move email sending off Gmail.
6. Clean the seeded place data, and add Fyndo's own photos to the most popular places.

**Exit gate:** a stranger can sign up, find a place, book and review on a mid-range Android phone on mobile data, with no help.

### Phase 1: closed beta (January to February 2027, about LKR 0/month)
- **Who to invite:**
  - 30–100 testers in Colombo 3–7, such as friends, a university group and food lovers.
  - 5–10 restaurants signed up in person, with a free owner plan during the beta.
- **Restaurants:** set up QR check-in stands at the partner places.
- **What to measure** (from Fyndo's own Supabase tables, not trackers):
  - weekly returning users
  - saves per user
  - bookings
  - reviews
  - check-ins
- **Each week:** ask testers one question, and fix the top complaint.

**Exit gate:** about 30% of testers are still active in week 4, and at least 3 restaurants actively use bookings.

### Phase 2: public launch in Colombo (from about March 2027)
- **Before going public:** upgrade to Supabase Pro.
- **Marketing,** in this order (mostly free, mostly content):
  1. Instagram and TikTok: short "where to go tonight" videos shot by the team, with the place tagged, posted consistently.
  2. Food bloggers and university societies share Fyndo lists. Don't pay for posts.
  3. Partner restaurants display Fyndo QR codes, since check-ins earn rewards. This is the cheapest acquisition channel.
  4. Small paid ads, but only after the free channels prove which message works.
- **Revenue:** the owner plan at LKR 5,000 a year. About 20 paying owners covers the monthly running costs.

**Exit gate:** steady organic growth, and owner revenue covers the bills.

### Phase 3: make money and expand (second half of 2027 onwards)
- **Revenue:**
  - more owner plans
  - featured placement, clearly labelled
  - events and offers
  - card payments
- **New cities, one at a time:** Kandy, then Galle or Negombo. Repeat the Phase 0 data checks for each.
- **Phone apps:** Play Store and App Store wrappers of the PWA.
- **Legal:** with growth, formalise PDPA duties (a data protection officer, and a process for data requests). Account deletion is currently handled by email within 30 days; a self-service delete button is a good future build.

### Traps to avoid
- Buying ads before retention is proven.
- Keeping real users' data on the Supabase free plan, which has no backups.
- Filling the map with scraped data.
- Launching in many areas at once.
- Promising features or numbers that don't exist yet.

---

## 9. Possible next builds (none started)
- Admin "import by place ID": link many places through the official Google API, storing only the IDs.
- Self-service account deletion and data export (this helps with PDPA).
- An admin metrics page built from Fyndo's own tables (no third-party analytics).
- Card payments for owner plans.
- Cloudflare Web Analytics, which is cookieless. Only after updating `/privacy`.
- Native app wrappers.

---

## 10. How to work on this project (for the assistant)
- **Check the docs first:** read `README.md` (setup), `PRODUCT.md` (product) and `DESIGN.md` (visual system) before changing anything.
- **Building and testing:**
  - `npm run build` creates `out/`.
  - `npm run local` runs the site and functions together at http://localhost:4280.
  - Demo mode works with no keys.
- **Database changes** go in a new `supabase/schema_vN.sql`. Each file must be safe to run again and must say which earlier files it needs. Keep Row Level Security on every table.
- **Every feature must work without Google and without AI** (quota or outage). Fyndo's own data is the fallback.
- **Commits** go to `main`, which deploys automatically.
- **Writing style:** plain English, short sentences, no jargon in the UI.
