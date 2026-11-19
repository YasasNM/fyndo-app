import { publicDetailsFor, safePublicUrl } from "@/lib/publicDetails";

export default function PublicVenueDetails({ spot, osmCreditShown = false }) {
  const entry = publicDetailsFor(spot);
  if (!entry) return null;
  const facts = entry.facts.filter((fact) => fact && typeof fact.key === "string" && typeof fact.label === "string" && fact.label.trim() && typeof fact.value === "string" && fact.value.trim() && typeof fact.sourceLabel === "string" && fact.sourceLabel.trim() && safePublicUrl(fact.sourceUrl));
  if (!facts.length) return null;
  const sources = entry.sources.filter((source) => source && safePublicUrl(source.url) && typeof source.label === "string" && source.label.trim());
  const hasOsm = sources.some((source) => source.kind === "osm");
  return (
    <section className="public-details card pad" aria-labelledby="public-details-h">
      <h2 id="public-details-h">Public venue details</h2>
      <p className="small muted">As reported by the sources below.</p>
      <dl className="public-details-facts">
        {facts.map((fact, index) => {
          const link = /(?:^|:)(?:website|menu)(?:_url)?$/.test(fact.key) ? safePublicUrl(fact.value) : null;
          return (
            <div className="public-details-fact" key={`${fact.key}-${index}`}>
              <dt>{fact.label}</dt>
              <dd>
                <div className="public-details-value">{link ? <a href={link} target="_blank" rel="noopener noreferrer">{fact.value}</a> : fact.value}</div>
                <a className="linkbtn small muted" href={fact.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {fact.sourceLabel}</a>
              </dd>
            </div>
          );
        })}
      </dl>
      {sources.length > 0 && <div className="public-details-sources small muted">
        <b>Sources</b>
        <ul>{sources.map((source, index) => <li key={`${source.url}-${index}`}>
          <a className="linkbtn" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
          {typeof source.retrievedAt === "string" && source.retrievedAt.trim() && <> · Retrieved <time dateTime={source.retrievedAt}>{source.retrievedAt}</time></>}
        </li>)}</ul>
      </div>}
      {hasOsm && !osmCreditShown && <p className="small muted public-details-credit">
        Data © <a className="linkbtn" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a className="linkbtn" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL</a>
      </p>}
    </section>
  );
}
