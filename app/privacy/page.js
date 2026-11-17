import Link from "next/link";

export const metadata = { title: "Privacy policy: Fyndo", description: "What Fyndo keeps about you, who else sees it, and how to change or delete it." };

const CONTACT = "fyndolk.official@gmail.com";

// Plain-language privacy policy. Keep it true: update it whenever Fyndo starts keeping or sharing something new.
export default function Privacy() {
  return (
    <div className="narrow legal">
      <h1>Privacy policy</h1>
      <p className="muted" style={{ marginTop: 0 }}>Last updated 17 November 2026</p>
      <p>
        Fyndo helps you find places to eat and things to do in Sri Lanka. This page explains what we keep about you,
        why, who else sees it and how you can change or delete it. We follow Sri Lanka's Personal Data Protection Act,
        No. 9 of 2022. Questions: <a className="linkbtn" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>No ads, no tracking, no analytics tools. We never sell your information.</li>
        <li>You can browse without an account. An account only keeps your saves, plans, reviews and bookings.</li>
        <li>Your location stays on your phone or computer. We never store it.</li>
        <li>You can edit your profile any time and ask us to delete your account.</li>
      </ul>

      <h2>What we keep</h2>
      <ul>
        <li><b>Your account:</b> email address, name, and phone number if you add one. Your password is stored scrambled by our sign-in provider; we can't read it.</li>
        <li><b>Your profile:</b> username, profile photo, bio, city and Top 4 places. Turn on <i>Private</i> and other people see only your name, not your profile, lists or who wrote your reviews.</li>
        <li><b>What you do on Fyndo:</b> reviews, check-ins, saved places, plans, lists, follows, likes, group votes, reports and messages you send us.</li>
        <li><b>Bookings:</b> your name, phone, date, time and party size. The restaurant you book sees these so it can hold your table.</li>
        <li><b>Restaurant owners:</b> the proof and payment receipts you upload to claim a page. These are kept in private storage that only you and Fyndo admins can open.</li>
        <li><b>Photos you add to a place:</b> shown publicly with your name once an admin approves them.</li>
      </ul>

      <h2>What stays on your device</h2>
      <p>
        <b>Location:</b> if you allow it, your browser uses your location to sort places by distance. It never leaves your device.
        <br /><b>Settings:</b> your theme, recent searches and similar preferences are kept in your browser's storage. Clearing your browser data removes them.
      </p>

      <h2>Who else handles your information</h2>
      <p>We only use services that need it to run Fyndo:</p>
      <ul>
        <li><b>Supabase</b> stores accounts and everything listed above (servers in Singapore).</li>
        <li><b>Microsoft Azure</b> hosts the website and its server functions.</li>
        <li><b>Gmail</b> sends account confirmation and password reset emails.</li>
        <li><b>AI services</b> (Groq, Cerebras, Google Gemini, OpenRouter and Azure OpenAI) answer Ask Fyndo and plan suggestions. They receive only your question and a shortlist of places, never your name, email or account.</li>
        <li><b>Google Maps</b> provides live place details, photos and reviews marked Google. Your browser asks Google for these through Fyndo's server.</li>
        <li><b>Cloudflare Turnstile</b> checks that a person, not a bot, is logging in or signing up.</li>
        <li><b>Maps, weather and exchange rates</b> come from OpenStreetMap, Open-Meteo and ExchangeRate-API. Fonts come from Google Fonts. These see your IP address like any website you load.</li>
        <li><b>Videos from YouTube, TikTok, Instagram or Facebook</b> load only after you tap them. That site's own privacy policy then applies.</li>
      </ul>

      <h2>What other people can see</h2>
      <p>
        Reviews, public profiles, lists and approved photos are public. Bookings, saves, plans, reports, messages to us and owner claims are private.
        Restaurant owners see the bookings and reviews for their own place only.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while you have an account. When you ask us to delete it, we remove your account, profile and
        everything linked to it within 30 days. Copies in backups are overwritten within a further 30 days.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><b>See and change:</b> edit your name, phone and profile in <Link className="linkbtn" href="/me">Me</Link>. Delete your own reviews, lists and plans there too.</li>
        <li><b>Get a copy or delete everything:</b> email <a className="linkbtn" href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address on your account. We answer within 30 days.</li>
        <li><b>Complain:</b> if you're unhappy with our answer, you can contact the Data Protection Authority of Sri Lanka.</li>
      </ul>

      <h2>Keeping it safe</h2>
      <p>
        All traffic is encrypted. Database rules stop people from reading each other's private information, and
        we limit how fast anyone can repeat actions. No system is perfect, so if you think your account was
        misused, change your password and tell us.
      </p>

      <h2>Children</h2>
      <p>Fyndo is for people aged 13 and over. If you think a child under 13 has an account, email us and we will delete it.</p>

      <h2>Changes</h2>
      <p>When this policy changes, we update the date at the top. If a change affects how we use your information, we will tell you in the app first.</p>

      <p className="small muted" style={{ marginTop: 28 }}>
        See also the <Link className="linkbtn" href="/terms">Terms of use</Link> and <Link className="linkbtn" href="/credits">Credits</Link>.
      </p>
    </div>
  );
}
