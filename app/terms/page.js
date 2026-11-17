import Link from "next/link";

export const metadata = { title: "Terms of use: Fyndo", description: "The rules for using Fyndo, posting reviews and listing a restaurant." };

const CONTACT = "fyndolk.official@gmail.com";

// Plain-language terms. Keep them in step with what the app actually does.
export default function Terms() {
  return (
    <div className="narrow legal">
      <h1>Terms of use</h1>
      <p className="muted" style={{ marginTop: 0 }}>Last updated 17 November 2026</p>
      <p>
        By using Fyndo you agree to these terms. If you don't agree, please don't use Fyndo.
        How we handle your information is in the <Link className="linkbtn" href="/privacy">Privacy policy</Link>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 13 or older. Use your real email and keep your password to yourself.</li>
        <li>One person, one account. Don't pretend to be someone else or a business you don't run.</li>
        <li>You are responsible for what is posted from your account.</li>
      </ul>

      <h2>What you post</h2>
      <p>Reviews, photos, lists, captions and profiles must be honest and your own. Don't post anything that:</p>
      <ul>
        <li>is fake, paid for, or written about your own business or a competitor;</li>
        <li>is hateful, threatening, sexual, or harasses someone;</li>
        <li>shares someone else's private details, such as a phone number or home address;</li>
        <li>copies photos or words you don't have the right to use;</li>
        <li>advertises, spams, or links to harmful sites.</li>
      </ul>
      <p>
        You keep ownership of what you post. You let Fyndo show it on Fyndo and in shared links for as long as it is on the site.
        Delete it and we stop showing it. Use <b>Report</b> on anything that breaks these rules; we review every report.
      </p>

      <h2>Place information</h2>
      <p>
        We try to keep prices, hours, menus and photos right, but they change and we can be wrong. Check with the place
        before you travel, especially on poya days and public holidays. Information marked Google comes from Google Maps.
      </p>

      <h2>Bookings</h2>
      <p>
        A booking is between you and the restaurant. Fyndo passes your request on; the restaurant confirms it.
        If you can't make it, cancel in Fyndo so someone else can have the table.
      </p>

      <h2>Ask Fyndo and plan suggestions</h2>
      <p>
        These answers are written by AI from Fyndo's own list of places. They can be wrong or out of date.
        Treat them as ideas, not advice, and check details that matter to you, such as allergies.
      </p>

      <h2>Restaurant owners</h2>
      <ul>
        <li>You may claim only a place you own or manage. We check your proof before you get access.</li>
        <li>The owner plan costs LKR 5,000 a year, paid by bank transfer. If we reject your claim, we refund the full amount.</li>
        <li>Owner replies must follow the same rules as reviews. You can't remove or change visitors' reviews.</li>
        <li>Keep your bookings, hours and menu up to date. We may remove owner access if a page is misused.</li>
      </ul>

      <h2>Things you must not do</h2>
      <ul>
        <li>Copy Fyndo's place list, reviews or photos in bulk, by script or otherwise.</li>
        <li>Try to break, overload or get around Fyndo's security or limits.</li>
        <li>Use Fyndo to break any law.</li>
      </ul>

      <h2>When we can act</h2>
      <p>
        We can remove content or suspend an account that breaks these terms. For serious or repeated problems we can close
        it. If you think we got it wrong, email <a className="linkbtn" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Photos and credits</h2>
      <p>Photos and data belong to their owners and are used under their licences. See <Link className="linkbtn" href="/credits">Credits</Link>.</p>

      <h2>Limits of our responsibility</h2>
      <p>
        Fyndo is provided as it is, free of charge for visitors. We are not responsible for a meal, visit or booking that
        goes wrong, or for losses caused by wrong information, as far as the law allows. Nothing here removes rights you
        have under Sri Lankan consumer law.
      </p>

      <h2>Law and changes</h2>
      <p>
        These terms follow the laws of Sri Lanka. If we change them, we update the date at the top and tell you in the app
        when the change matters. Using Fyndo after that means you accept the new terms.
      </p>

      <p className="small muted" style={{ marginTop: 28 }}>
        Questions: <a className="linkbtn" href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </div>
  );
}
