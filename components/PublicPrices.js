import { publicPricesFor } from "@/lib/publicPrices";
import { lkr } from "@/lib/utils";

const channels = { delivery: "Delivery menu prices", dine_in: "Dine-in menu prices", published_menu: "Published menu prices" };

function PriceSource({ value }) {
  return <div className="small muted public-price-source">
    <a className="linkbtn" href={value.sourceUrl} target="_blank" rel="noopener noreferrer">{value.sourceLabel}</a>
    {" · Retrieved "}<time dateTime={value.retrievedAt}>{value.retrievedAt.slice(0, 10)}</time>
  </div>;
}

function MenuItems({ rows }) {
  return <ul className="public-price-items">{rows.map((item, i) => <li key={i}>
    <div className="public-price-row"><span>{item.item}</span><b>{lkr(item.price)} <span className="small muted">/ item</span></b></div>
    {typeof item.priceNote === "string" && item.priceNote.trim() && <div className="small muted">{item.priceNote}</div>}
    <PriceSource value={item} />
  </li>)}</ul>;
}

// Auxiliary public evidence only: never merge with the owner's menu/bill estimator.
export default function PublicPrices({ spot }) {
  const prices = publicPricesFor(spot);
  if (!prices) return null;
  const { spend, items } = prices;
  return <section className="card pad public-prices" aria-label="Reported prices">
    <h2>Reported prices</h2>
    {spend && <div className="public-price-group">
      <h3>Reported spend per person (estimate)</h3>
      <b>{lkr(spend.min)}{spend.min !== spend.max && ` to ${Number(spend.max).toLocaleString("en-US")}`}</b>
      <PriceSource value={spend} />
    </div>}
    {Object.entries(channels).map(([channel, label]) => {
      const rows = items.filter((item) => item.channel === channel);
      return rows.length ? <div className="public-price-group" key={channel}>
        <h3>{label}</h3>
        <MenuItems rows={rows.slice(0, 8)} />
        {rows.length > 8 && <details>
          <summary>View remaining {rows.length - 8} menu items</summary>
          <MenuItems rows={rows.slice(8)} />
        </details>}
      </div> : null;
    })}
    <p className="small muted public-price-note">Source-reported, not confirmed current prices. Taxes, service and delivery charges are not specified; check with the venue.</p>
  </section>;
}
