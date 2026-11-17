# Fyndo · Find the real spots

One app to find great places and plan dates in Sri Lanka.
Works as a **website** and an **installable phone app** (Android and iPhone), from one codebase.

Hosted on **Azure Static Web Apps (Free plan)**, data in **Supabase (free)**, live place info from **Google Maps**, smart search with **Azure OpenAI**.

---

## What it does

| Part | What it does |
|---|---|
| ✨ Ask Fyndo | Type "anniversary dinner under 8000 in Colombo 7". AI turns it into filters, then Fyndo builds a plan from **real Fyndo spots only** (AI never invents places). If AI is off, a simple keyword backup still works. |
| Home | Search, mood chips, area / budget / type filters, "Open now", "Can book", hidden gems |
| Plan a Date | 4 quick questions, then a full night plan within your budget. Swap, Share on WhatsApp, Save |
| Spot page | Video (TikTok / Reel / YouTube link), Fyndo menu and prices, **live Google info**: rating, open now, address, phone, hours, photo, Google reviews |
| Booking (optional) | Only if the restaurant turns it on. Instant or Request & approve. Otherwise WhatsApp / Call |
| Saved, Me | Saved spots and plans, bookings, cancel, "Install app" |
| Business dashboard | Owner handles bookings, booking settings, menu and page |
| Admin | **Find on Google** to add real places, mark Verified, set owners |

### How Google data is used (following Google's rules)
- Fyndo stores only the **Google place ID**. Rating, hours, photos and reviews are loaded **live** from Google each time.
- Every Google section shows "Google Maps", credits photo and review authors, and links back to Google Maps.
- We do **not** make AI summaries of Google reviews. Google's terms say apps "will not create content based on Google Maps Content", and Google's own review summaries aren't offered in Sri Lanka yet. AI summaries can come later for Fyndo's own reviews.

---

## Folder map
```
app/            pages (home, plan, spot, book, saved, me, login, dashboard, admin)
components/     AskFyndo, GooglePanel, nav, spot card, PWA
lib/            data (demo.js / live.js), planner, askLocal (AI backup), api calls, utils
api/            server functions on Azure: ask (AI), place, photo, places-search (Google)
supabase/       schema.sql (tables + security rules), seed.sql (sample places, optional)
public/         icons, manifest, service worker, staticwebapp.config.json (Azure settings)
.github/        workflows/azure-static-web-apps.yml (auto deploy)
scripts/        local-server.mjs (run site + API on your laptop like Azure does)
```

---

# Deploy to Azure: step by step

You'll do 6 parts. Take them in order. Each takes 5 to 15 minutes.

## Part 1: Put the code on GitHub
1. Make a free account at **github.com** if you don't have one.
2. Install **GitHub Desktop** (desktop.github.com). It uploads hidden folders like `.github` correctly. The website drag-and-drop often skips them.
3. GitHub Desktop: **File > Add local repository** > choose this `fyndo-app` folder > it asks to create a repository > **Create**.
4. Click **Publish repository**. Keep **"Keep this code private"** ticked. Branch must be **main**.

## Part 2: Database (Supabase, free)
1. **supabase.com** > New project. Name `fyndo`, region **Singapore**, strong password (save it).
2. **SQL Editor** > New query > paste all of `supabase/schema.sql` > **Run**.
   (Already ran it before? Run it again. It safely adds the new Google column.)
   **Then run `supabase/schema_v3.sql`, `supabase/schema_v4.sql`, `supabase/schema_v5.sql`, `supabase/schema_v6.sql`, `supabase/schema_v7.sql` and `supabase/schema_v8.sql` the same way, in that order** (v4 adds free photo storage; v5 adds photo credits, place websites and restaurant owner claims; v6 adds official links, visitor photos and the weekly photo job; v7 adds profiles, follows, likes and lists; v8 tightens security: private reviews, safe links, daily spam limits).
   It adds QR check-ins and rewards, verified reviews, owner replies, private feedback, reports, collections and group votes. Safe to run again. Paste the file's contents, not its name.
3. **Real places:** run `supabase/seed_google.sql` the same way. It adds 177 real restaurants, cafés, dessert places and things to do in Colombo 3, 4, 5, 7, Dehiwala and Mount Lavinia, each linked to its Google listing, with Google's price level and usual hours. Skip `seed.sql` (made-up samples).
4. **Accounts (email verification and password reset):**
   - **Authentication > Sign In / Providers > Email**: turn **on** "Confirm email". New users must click the link in their email before they can log in.
   - **Authentication > URL Configuration**: set **Site URL** to your live address (for example `https://YOUR-SITE.azurestaticapps.net`). Under **Redirect URLs** add `https://YOUR-SITE.azurestaticapps.net/**` (and your custom domain if you have one).
   - **Email sending (important for production):** Supabase's built-in email only sends a few emails an hour and is meant for testing, so connect your own sender. See **"Emails going to spam"** below for the setup that lands in the inbox.
   - Optional: **Authentication > Emails** lets you edit the wording of the confirmation and reset emails.

### Emails going to spam: the fix
**Why it happens:** the emails say they are from `fyndolk.official@gmail.com` but are sent by Brevo's servers. Gmail and Yahoo now check that mail "from" a gmail.com address really comes from Google (SPF/DKIM/DMARC). It doesn't, so it is marked as spam.

**Free fix now: send through Gmail itself** (works up to about 500 emails a day):
1. Sign in to `fyndolk.official@gmail.com` > **myaccount.google.com > Security** > turn on **2-Step Verification**.
2. Open **myaccount.google.com/apppasswords**, create one named `Fyndo Supabase`, and copy the 16-letter code (this is a password: never put it in code or GitHub).
3. Supabase > **Authentication > Emails > SMTP Settings** > **Enable custom SMTP**:
   - Sender email: `fyndolk.official@gmail.com`, Sender name: `Fyndo`
   - Host: `smtp.gmail.com`, Port: `465`
   - Username: `fyndolk.official@gmail.com`, Password: the 16-letter code (no spaces)
   - **Save**. Then **Authentication > Rate Limits**: set "emails sent per hour" to what you need (for example 100).
4. Test: sign up with a new address, and also try "Forgot password". If an early email still lands in spam, open it and press **Report not spam**; this teaches Gmail quickly.
5. In Brevo you can leave the account as it is; it is no longer used.

**Best long-term fix (when you have a domain):** buy a domain (for example `fyndo.lk` or a `.com`), add it in Brevo under **Senders, Domains & Dedicated IPs > Domains > Authenticate**, add the DKIM, Brevo code and DMARC (`v=DMARC1; p=none`) records it shows to your domain's DNS, then send from `no-reply@yourdomain`. That has no 500-a-day limit.

**Also check:** the Site URL in **Authentication > URL Configuration** is your real site address (links that point somewhere else look suspicious), and keep the email wording plain: a short sentence and the button, no ALL CAPS.
5. **Project Settings > API**: keep the **Project URL** and **anon public key** open in a tab.

## Part 3: Create the Azure Static Web App (free)
1. **portal.azure.com** > search **Static Web Apps** > **Create**.
2. Fill in:
   - Subscription: **Azure for Students**
   - Resource group: **Create new** > `fyndo-rg`
   - Name: `fyndo`
   - Plan type: **Free**
   - Region: **East Asia** (closest to Sri Lanka)
   - Deployment source: **Other** (our GitHub workflow does the deploy)
3. **Review + create** > **Create** > **Go to resource**.
4. On the Overview page click **Manage deployment token** > **Copy**.

## Part 4: Connect GitHub to Azure
1. On github.com open your `fyndo-app` repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. Add 3 secrets:

   | Name | Value |
   |---|---|
   | `AZURE_STATIC_WEB_APPS_API_TOKEN` | the deployment token from Part 3 |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

2. Repo > **Actions** tab > **Deploy Fyndo to Azure** > **Run workflow**. Wait for the green tick (about 2 to 3 minutes).
3. Back in Azure, the **Overview** page shows your **URL** (like `https://something.azurestaticapps.net`). Open it. Fyndo is live.

From now on, every change you push from GitHub Desktop deploys by itself.

## Part 5: Turn on Google and AI (server settings)
Azure portal > your Static Web App > **Settings > Environment variables** > add these, then **Apply**:

| Name | Where to get it |
|---|---|
| `SUPABASE_URL` | same as Part 2 |
| `SUPABASE_ANON_KEY` | same as Part 2 |
| `GOOGLE_MAPS_API_KEY` | Part 5a below (server key) |
| `AZURE_OPENAI_ENDPOINT` | Part 5b below |
| `AZURE_OPENAI_API_KEY` | Part 5b below |
| `AZURE_OPENAI_DEPLOYMENT` | Part 5b below (the deployment name, e.g. `gpt-4o-mini`) |

| `GROQ_API_KEY` | **Free AI (recommended).** console.groq.com, no card. About 1,000 Ask Fyndo questions a day free. |
| `CEREBRAS_API_KEY` | **Free AI backup.** cloud.cerebras.ai, no card. About 14,400 a day free. |
| `GEMINI_API_KEY` | Free AI, aistudio.google.com, no card (small daily limit; free-tier questions may be used by Google for training). |
| `OPENROUTER_API_KEY` | Free AI, openrouter.ai `:free` models, about 50 a day. |

You only need **one** AI key. Add more and Fyndo tries them in order (Groq, Cerebras, Gemini, OpenRouter, then Azure OpenAI), moving to the next if one is busy or out of free quota. Without any, Ask Fyndo still works with simple keyword matching.

The same free AI keys also power two decision helpers, and neither can invent a place or a price:
- **Plan a date, tuned by AI:** the planner's rules shortlist up to 8 suitable Fyndo places for each stop (open at that time, inside the budget, right vibe). The AI then chooses the best combination for the person's wishes ("she loves seafood"), with a one-line reason per stop and a tip. Every choice is checked on the server (it must come from the shortlist, no place twice, the night must fit the budget); if a provider fails the checks the next one is asked, and if none answers the rules' plan simply stays.
- **Help me choose** on the Compare page: the AI recommends one of the 2 or 3 places using only the details in the table and what the person says matters.
Only public place details and the person's own note are sent to the AI, never names, emails or phone numbers.
The free Gemini tier may use what people type to improve Google's products. Fyndo only sends the search sentence, never names or emails.

These keys stay on the server. They are never sent to people's browsers.

**Key safety:** never paste a key into code, GitHub or a chat. If one is exposed, open Google Cloud > Credentials, delete it and make a new one. For the Google key Fyndo uses, set **API restrictions** to *Places API (New)* only and cap the daily quota. Don't use an "HTTP referrer" restriction on it, because the key is used by the server, not the browser.

### 5a. Google Maps key
1. **console.cloud.google.com** > create a project `fyndo`.
2. **Billing**: link a billing account (needs a card). Small apps usually stay inside Google's free monthly allowance.
3. **APIs & Services > Library** > search **Places API (New)** > **Enable**.
4. **APIs & Services > Credentials > Create credentials > API key**.
   Edit the key > **API restrictions** > **Restrict key** > tick only **Places API (New)** > Save.
5. **Protect your wallet (important):**
   - **Billing > Budgets & alerts** > create a budget of **USD 1** with email alerts. (Alerts warn you. They don't stop charges.)
   - **APIs & Services > Places API (New) > Quotas**: this is the hard stop. Google gives a free number of calls each month for each kind of request (see the Places API pricing page). Set each **per day** limit to about that monthly free number divided by 30, so you never pay. The ones Fyndo uses for visitors are **GetPlaceRequest** (place pages and card photos) and **GetPhotoMediaRequest** (photos). Text Search is only used by admins.
   - If a daily limit is too low, Google photos and ratings simply stop for the rest of that day (it resets at midnight, US Pacific time). Visitors see Fyndo's own info and example photos; nothing breaks.
   - Fyndo also helps: when Google says a limit is reached, the server stops asking Google for 15 minutes and every visitor's browser stops for 10, instead of hammering it. Google info is cached for 30 minutes on the server and in the browser, reviews only load when someone taps "Show Google reviews", and each visitor has an hourly limit. `GOOGLE_CARD_PHOTOS=off` in Azure turns off Google photos on cards completely.

### 5b. Azure OpenAI (for Ask Fyndo)
1. Azure portal > search **Azure OpenAI** > **Create**. Resource group `fyndo-rg`, region **East US** (or any region that offers the model), tier **Standard S0**.
2. Open it > **Go to Azure AI Foundry portal** > **Deployments** > **Deploy model** > pick a small, cheap model such as **gpt-4o-mini** or **gpt-4.1-mini** (whichever your region lists).
   The deployment name you type is your `AZURE_OPENAI_DEPLOYMENT`.
3. Back in the Azure portal resource > **Keys and Endpoint**: copy **Endpoint** and **Key 1**.

**If it says "insufficient quota":** some student subscriptions get zero quota for GPT models. Try another region, or ask for quota (portal > **Quotas**). Until then Fyndo still works: Ask Fyndo uses its keyword backup and shows "Quick match (AI is off right now)".

## Part 6: Make yourself admin and add real places
1. Open your Fyndo URL > **Me** > sign up with your email.
2. Supabase **SQL Editor**:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@gmail.com';
   ```
3. Log out and in again. Open **Admin** > **+ Add spot** > **Find on Google** > type "name + area" > pick the right result.
4. Fill in the Fyndo parts that Google doesn't have: price range, moods, your menu and prices, video link, booking. Tick **Verified** after you visit.
5. Owners: they sign up, then **Admin > Set owner** with their email (or they claim their page themselves, below).

### Real photos for places
**Admin > Tools > Find real photos** goes through every place that has no photo and looks it up for free in three places it is allowed to show:
OpenStreetMap (the place's photo, Wikimedia file or website), Wikimedia Commons (photos taken at the place whose title names it), and the place's own
website (the picture it uses for link previews, or a large photo on its home page). Every photo keeps a credit ("From their website", "Wikimedia Commons").
Many small places have no website or open photos, so expect some places to stay on example photos; owners can add their own once they claim the page.
For one place: **Edit** it > **Find real photos**, then tick the ones you want. Photos never come from Google here, because Google's terms don't allow keeping its photos.

### Weekly photo job (free, GitHub Actions)
`tools/photo-pipeline/pipeline.py` runs every Sunday at 2 AM (Sri Lanka time) on GitHub's free servers and looks at up to 25 places with no photo:
1. **Official links:** a free AI with web search (Gemini, or Groq as a backup) suggests the place's website, Facebook page and Instagram. Each link is checked before it is kept: the website must load and name the place; Facebook and Instagram links must be the place's own page (directories, delivery apps, review sites and groups are thrown away).
2. **Photos from the place's own website**, read with [Scrapling](https://github.com/D4Vinci/Scrapling). It obeys `robots.txt`, says who it is (`FyndoBot`), and skips any site that blocks it. It never solves Cloudflare challenges or disguises itself, and never touches Google Maps, TripAdvisor, Facebook or Instagram pages.
3. **AI photo check:** a free vision model keeps only real photos of the food, drinks, inside or outside, and drops logos, banners and stock art. Each kept photo is credited to the website.
4. **Menus:** priced menu items found on the website go to **Admin > Tools > Menu suggestions**. Nothing changes until you press Apply.

Set it up once: **Supabase > Project Settings > API keys** > copy the **secret (service_role)** key. Then on GitHub **Settings > Secrets and variables > Actions > New repository secret**, add `SUPABASE_SERVICE_ROLE_KEY`, plus `GEMINI_API_KEY` (and optionally `GROQ_API_KEY`). The service role key can change anything in your database: keep it only in GitHub secrets, never in code or Azure. To run it now: **Actions > Find place photos > Run workflow** (tick "Dry run" first to see what it would do).

### Official links, embeds and visitor photos
- Admins (Spot form) and owners (Business > Edit page) can add the website, Facebook page, Instagram account and up to 6 Instagram post links. The place page shows them, and the posts through Facebook's and Instagram's official embeds, which load only when tapped.
- Logged-in visitors can **Add a photo** on any place page. Photos wait in **Admin > Tools > Visitor photos** until you approve them; approved photos are credited "Fyndo visitor", rejected ones are deleted. Run `supabase/schema_v6.sql` first.

### Social: profiles, friends, lists and story sharing (no chat)
Run `supabase/schema_v7.sql` first. Like Letterboxd, but for places:
- **Profiles:** **Me > Set up** picks a @username, photo, bio, city and **Top 4** places. Profiles are public by default; the **Private profile** switch hides the profile, diary and lists (reviews still show on place pages with the first name only). Email and phone are never shown.
- **Diary:** every place you rate appears on your profile with your stars and words.
- **Friends:** follow people (no messages). The **Friends** tab shows what they rate and the lists they make, and finds people by name or @username.
- **Likes and lists:** heart other people's reviews; make lists like "Best kottu in Colombo 4" from your profile or with **Add to a list** on any place.
- **Story sharing:** "Share as story" on your reviews, "Share" on earned badges, lists and profiles makes a 1080x1920 image on the phone and opens the share sheet (Instagram/Facebook/WhatsApp stories), or saves it.
- **Moderation:** anyone can report a profile or list; **Admin > Reports** can remove a profile's photo and bio or delete a list.

### Restaurant owners claiming their page
1. On any place without an owner, people see **"Own or run this place? Claim this page"** (also under **Me** and **Business**).
2. They fill in their name, role and phone, upload proof (business registration, a bill in the business name, or a photo at the counter), and get a reference like `FYC-AB12CD`.
3. They pay **LKR 5,000 for 12 months by bank transfer**: the app tells them to email `fyndolk.official@gmail.com` with the reference, you reply with your bank details, and they upload the receipt.
4. **Admin > Owner claims**: open the proof, press **Payment received** when the money arrives, then **Approve owner**. They become the owner for 12 months, and the **Business** dashboard opens for them.
5. In the last month the dashboard offers **Renew**: they send a short renewal claim and pay again; when you approve it, 12 months are added on top of the time left. If the plan runs out, their changes stop saving until they renew.
Proof and receipts are private (only that person and admins can open them). To change the fee later, edit `owner.feeLkr` in `lib/config.js` and `fee_lkr` in `supabase/schema_v5.sql`.

---

## Phone app
Open your Fyndo URL:
- **Android (Chrome):** menu **⋮** > **Install app** (or the **Install app** button on the Me page)
- **iPhone (Safari):** **Share** > **Add to Home Screen**

## Run it on your laptop
```
npm install
npm run dev          # quick preview, demo mode (no API features)
npm run build
npm run local        # site + server functions together, like Azure: http://localhost:4280
```
For `npm run local` with Google and AI, copy `api/local.settings.example.json` to `api/local.settings.json` and fill in your keys. (It's ignored by git, so keys never reach GitHub.)
Database keys for the website go in `.env.local` (copy `.env.example`).

## Costs at a glance
| Service | Plan | Cost |
|---|---|---|
| Azure Static Web Apps | Free | LKR 0 (doesn't use your student credit) |
| Supabase | Free | LKR 0 (pauses after 1 week with no use; click Restore) |
| Google Places API (New) | Pay as you go with a free monthly allowance per feature | Usually LKR 0 at small scale. Set the quota caps in 5a |
| Azure OpenAI | Pay per use from your USD 100 student credit | A few cents a day at small scale |

## Security built in
- Google and AI keys live only in Azure server settings.
- Only admins can search Google (checked on the server with their Supabase login).
- AI answers are cleaned: only known areas, moods and types are accepted, and places come only from Fyndo's own list.
- Database rules: users see only their own bookings, saves and plans. Owners see only their own place. Nobody can over-book a slot or confirm their own booking.
- Database limits (v8): daily caps on reviews, reports, follows, likes, votes and messages stop spam bots. Private profiles stay private in reviews. Links on places must be real web addresses; profile photos must be uploaded in Fyndo.
- Browser protections: a strict Content Security Policy, HTTPS only (HSTS), no framing by other sites. Set in `public/staticwebapp.config.json`.
- Log in, sign up and password reset can require a bot check (Cloudflare Turnstile, free). See below.
- Raw data exports (the `Res data/` folder) are never committed. They are in `.gitignore`.

### Security checklist (do these once)
1. **Run `supabase/schema_v8.sql`** in the Supabase SQL Editor.
2. **Bot check (recommended):**
   - **dash.cloudflare.com > Turnstile > Add widget.** Add your site's domain and choose **Managed**.
   - **GitHub repo > Settings > Secrets and variables > Actions > New repository secret.** Name `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, value: the **site key**. Push any change so the site rebuilds.
   - **After the new build is live,** go to **Supabase > Authentication > Attack Protection.** Turn on **CAPTCHA protection**, choose **Turnstile** and paste the **secret key**. Turning it on before the site key is live blocks every login.
3. **Supabase > Authentication > Providers > Email:** set the minimum password length to 8, and turn on **Secure email change** and **Secure password change**.
4. **Supabase > Authentication > Rate Limits:** keep the defaults or lower them. Don't raise them.
5. **Turn on 2-step sign-in for every admin account.** Use it on Supabase, GitHub, Azure, Google Cloud and the Fyndo Gmail account.
6. **Replace any key that was ever pasted into a chat, email or file.** That includes the Google Maps key and the Gmail app password. Create a new one, update it in Azure or Supabase, then delete the old one.
7. **GitHub repo > Settings > Code security:** turn on **Dependabot alerts**, **Dependabot security updates** and **Secret scanning**. `.github/dependabot.yml` already asks for weekly update checks.
8. **Backups:** the free Supabase plan has no automatic backups. Once a week, open **Database > Backups**, or run `supabase db dump` on your laptop. Keep the file somewhere private, never in this repo. The Pro plan makes daily backups.
9. **Legal pages:** `/privacy` and `/terms` are live. Update them whenever Fyndo starts keeping or sharing something new.
