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
   **Then run `supabase/schema_v3.sql` the same way.** It adds QR check-ins and rewards, verified reviews, owner replies, private feedback, reports, collections and group votes. Safe to run again. Paste the file's contents, not its name.
3. **Skip `seed.sql`** for real launch. You'll add real places from Google in Part 6.
4. **Authentication > Sign In / Providers > Email**: turn off "Confirm email" for now.
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
| `GOOGLE_MAPS_API_KEY` | Part 5a below |
| `AZURE_OPENAI_ENDPOINT` | Part 5b below |
| `AZURE_OPENAI_API_KEY` | Part 5b below |
| `AZURE_OPENAI_DEPLOYMENT` | Part 5b below (the deployment name, e.g. `gpt-4o-mini`) |

| `GEMINI_API_KEY` | **Free AI option.** Get a key at aistudio.google.com (no card). Use it instead of Azure OpenAI. Optional `GEMINI_MODEL` if you want a different model (default `gemini-2.5-flash`). |

You only need **one** AI option (Gemini or Azure OpenAI). If both are set, Gemini is used first and Azure is the backup.
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
   - **APIs & Services > Places API (New) > Quotas**: lower the request limits to small numbers (for example 30 to 60 per minute). This is the hard stop.
   - Fyndo also helps: reviews only load when someone taps "Show Google reviews", Google info is cached for 10 minutes, and each visitor has an hourly limit.

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
5. Owners: they sign up, then **Admin > Set owner** with their email.

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
