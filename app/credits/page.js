import { PHOTOS } from "@/lib/photoCredits";
import Link from "next/link";

export const metadata = { title: "Credits: Fyndo" };

// Photo and data credits. Required by the photo licences, and fair to the people and projects behind them.
export default function Credits() {
  return (
    <div className="narrow">
      <h1>Credits</h1>
      <p className="muted" style={{ marginTop: 0 }}>Fyndo is built on the work of photographers and open projects. Thank you.</p>

      <h2>Photos</h2>
      <p className="small muted">From Wikimedia Commons, used under the licence shown. Photos are resized for the web.</p>
      <div className="stack">
        {Object.values(PHOTOS).map((p) => (
          <div key={p.slug} className="card pad row" style={{ gap: 14, flexWrap: "nowrap", alignItems: "flex-start" }}>
            <img src={`/img/${p.slug}-500.jpg`} alt={p.alt} width={96} height={Math.round(96 / p.ratio)} style={{ borderRadius: 8, objectFit: "cover", flex: "none" }} loading="lazy" />
            <div className="small">
              <b>{p.alt}</b><br />
              By {p.author}. <a className="linkbtn" href={p.source} target="_blank" rel="noreferrer">Source</a>
              {p.licenseUrl ? <> · <a className="linkbtn" href={p.licenseUrl} target="_blank" rel="noreferrer">{p.license}</a></> : <> · {p.license}</>}
            </div>
          </div>
        ))}
      </div>

      <h2>Video</h2>
      <div className="card pad small">
        <b>Kottu roti being made at a roadside stall</b> (8-second excerpt, sound removed).<br />
        By Nahid Sultan. <a className="linkbtn" href="https://commons.wikimedia.org/wiki/File:Making_of_Kothu_Roti,_Sri_Lanka.webm" target="_blank" rel="noreferrer">Source</a>
        {" · "}<a className="linkbtn" href="https://creativecommons.org/licenses/by/3.0" target="_blank" rel="noreferrer">CC BY 3.0</a>
      </div>

      <h2>Data and maps</h2>
      <ul className="small" style={{ paddingLeft: 18 }}>
        <li>Places, photos, ratings and reviews marked Google come from Google Maps.</li>
        <li>Maps: &copy; <a className="linkbtn" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, drawn with Leaflet.</li>
        <li>Weather and sunset times: <a className="linkbtn" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>.</li>
        <li>Exchange rates: <a className="linkbtn" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>.</li>
      </ul>

      <p className="small muted legal-links" style={{ marginTop: 28 }}>
        <Link className="linkbtn" href="/privacy">Privacy policy</Link>
        <Link className="linkbtn" href="/terms">Terms of use</Link>
      </p>
    </div>
  );
}
