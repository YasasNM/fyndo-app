import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPriceModules } from './load-utils.mjs';
import { renderFrontend } from './render-frontend.mjs';
export const spot = { id: 'osm-node-12345', name: 'Current branch name', category: 'Restaurant', area: 'Colombo', moods: [], photos: [], menu: [], price_min: 0, price_max: 0 };
export const source = { sourceUrl: 'https://venue.example.com/menu', sourceLabel: 'Venue menu', retrievedAt: '2026-11-19T09:30:00Z', quote: 'Reported range for one person.' };
export const entry = { id: spot.id, name: 'Confirmed branch alias', spend: { min: 1200, max: 1800, currency: 'LKR', unit: 'per_person', estimated: true, channel: 'reported', ...source }, items: [], sources: [{ url: source.sourceUrl, label: source.sourceLabel, retrievedAt: source.retrievedAt }], identityEvidence: { basis: 'exact_branch' } };

test('reported spend displays and plans as an estimate without changing owner fields or strict budget eligibility', async () => {
  const { utils, publicPrices } = await loadPriceModules({ [spot.id]: entry });
  const before = JSON.stringify(spot);
  assert.equal(publicPrices.publicPricesFor(spot).spend.min, 1200);
  assert.equal(publicPrices.publicPricesFor(spot).name, spot.name, 'current listing name wins over the evidence alias');
  assert.equal(utils.priceLabel(spot), 'Reported LKR 1,200 to 1,800 pp (estimate)');
  assert.equal(utils.avgPrice(spot), 1500);
  assert.equal(utils.priceKnown(spot), false);
  assert.doesNotMatch(utils.whyThis(spot, { budget: 10000 }), /fits your budget/);
  assert.equal(JSON.stringify(spot), before);
  const owner = { ...spot, price_min: 4000, price_max: 5000, menu: [{ item: 'Owner dish', price: 800 }] };
  assert.equal(utils.priceLabel(owner), 'LKR 4,000 to 5,000 pp');
  assert.equal(utils.avgPrice(owner), 4500);
  assert.equal(utils.priceKnown(owner), true);
  assert.match(utils.whyThis(owner, { budget: 10000 }), /fits your budget/);
});

test('invalid, zero, non-finite, unsourced and unsafe reported values are never usable', async () => {
  const invalidSpends = [
    { min: 0 }, { min: -1 }, { min: '1200' }, { min: NaN }, { max: Infinity }, { min: 2000 },
    { unit: 'item' }, { currency: 'USD' }, { estimated: false }, { channel: 'delivery' }, { quote: '' }, { retrievedAt: 'yesterday' }, { retrievedAt: '2026-02-30' },
    ...['javascript:alert(1)', 'https://user:pass@venue.example.com/menu', 'http://127.0.0.1/menu', 'https://venue.local/menu', 'https://venue.example.com/menu?token=secret', 'https://venue.example.com/menu?access_token=secret', 'https://venue.example.com/menu?api_key=secret', 'https://venue.example.com/login', 'https://venue.example.com/menu#token=secret'].map(sourceUrl => ({ sourceUrl })),
  ];
  for (const change of invalidSpends) {
    const { publicPrices, utils } = await loadPriceModules({ [spot.id]: { ...entry, spend: { ...entry.spend, ...change } } });
    assert.equal(publicPrices.publicPricesFor(spot), null, JSON.stringify(change));
    assert.equal(utils.priceLabel(spot), 'Prices not added yet');
    assert.equal(utils.avgPrice(spot), 2000);
  }
  for (const change of [{ id: 'other-id' }, { identityEvidence: { basis: 'same_brand' } }, { sources: [] }, { items: null }, { name: '' }]) {
    const { publicPrices } = await loadPriceModules({ [spot.id]: { ...entry, ...change } });
    assert.equal(publicPrices.publicPricesFor(spot), null);
  }
  const { publicPrices } = await loadPriceModules({ [spot.id]: entry });
  assert.equal(publicPrices.publicPricesFor({ ...spot, id: 'osm-node-999' }), null);
  assert.equal(publicPrices.publicPricesFor({ ...spot, id: '../osm-node-12345' }), null);
});

test('real ISO retrieval timestamps retain fractions and offsets without comparing the local date to UTC', async () => {
  for (const retrievedAt of ['2026-11-19T16:11:30.623924+00:00', '2026-11-19T16:11:30.623924Z', '2026-11-19T00:10:00+05:30']) {
    const data = { ...entry, spend: { ...entry.spend, retrievedAt }, sources: [{ ...entry.sources[0], retrievedAt }] };
    const { publicPrices } = await loadPriceModules({ [spot.id]: data });
    assert.equal(publicPrices.publicPricesFor(spot)?.spend.retrievedAt, retrievedAt);
  }
});

export const items = ['delivery', 'dine_in', 'published_menu'].map((channel, i) => ({ item: `${channel} dish`, price: 500 + i * 100, currency: 'LKR', unit: 'item', channel, ...source, quote: 'Item prices from the menu.' }));
export async function priceRenderOptions(s = spot, data = { ...entry, items }) {
  const { utils, publicPrices } = await loadPriceModules({ [spot.id]: data });
  return { spot: s, utils, overrides: { '@/lib/publicPrices': publicPrices, '@/lib/rates': { useUsdRate: () => ({ rate: 300 }) }, '@/lib/glossary': { dishNote: () => '' } }, realModules: ['@/components/VenuePhoto', '@/components/SpotCard', '@/components/MenuPanel', '@/components/PublicPrices'] };
}

test('actual detail JSX attributes reported spend and separate menu channels without replacing owner menu or photos', async () => {
  const owner = { ...spot, about: 'Owner About remains.', price_min: 4000, price_max: 5000, menu: [{ item: 'Owner dish', price: 800 }], menu_updated_at: '2026-11-01' };
  const before = JSON.stringify(owner);
  const options = await priceRenderOptions(owner);
  const linkedMenu = 'https://venue.example.com/owner-menu';
  const details = { [spot.id]: { id: spot.id, name: spot.name, facts: [{ key: 'menu', label: 'Linked menu', value: linkedMenu, ...source }], sources: entry.sources } };
  const helperSource = (await readFile(new URL('../lib/publicDetails.js', import.meta.url), 'utf8')).replace('import registry from "./publicDetails.json";', `const registry = ${JSON.stringify(details)};`);
  options.overrides['@/lib/publicDetails'] = await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`);
  options.realModules.push('@/components/PublicVenueDetails');
  const html = await renderFrontend('app/spot/page.js', options);
  assert.match(html, /href="https:\/\/venue.example.com\/owner-menu"/);
  assert.match(html, /Reported prices/);
  assert.match(html, /Reported spend per person \(estimate\)/);
  assert.match(html, /Delivery menu prices/);
  assert.match(html, /Dine-in menu prices/);
  assert.match(html, /Published menu prices/);
  assert.match(html, /Owner dish/);
  assert.match(html, /Owner About remains/);
  assert.match(html, /4,000–5,000/);
  assert.match(html, /LKR 1,200 to 1,800/);
  assert.match(html, /No venue photo/);
  assert.doesNotMatch(html, /Fyndo verified prices|confirmed prices|average spend/i);
  assert.match(html, /Taxes, service and delivery charges are not specified/);
  assert.ok([...html.matchAll(/href="https:\/\/venue.example.com\/menu"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/g)].length >= 4);
  assert.ok([...html.matchAll(/2026-11-19/g)].length >= 4, 'each price has its source retrieval date');
  assert.equal(JSON.stringify(owner), before);
  const missing = await renderFrontend('components/PublicPrices.js', { ...(await priceRenderOptions()), props: { spot: { ...spot, id: 'unknown-id' } } });
  assert.equal(missing, '');
});

test('actual card and detail headline show reported estimate while owner headline stays curated', async () => {
  const options = await priceRenderOptions();
  const html = await renderFrontend('components/SpotCard.js', { ...options, props: { spot, pick: { on: false, toggle() {} } } });
  const main = html.match(/class="pcard-link"[^>]*>([\s\S]*?)<\/a>/)[1];
  assert.match(main, /Reported LKR 1,200 to 1,800 pp \(estimate\)/);
  assert.doesNotMatch(main, /<a\b|<button|https:\/\/venue.example.com/);
  assert.match(html, /pcard-actions/);
  const detail = await renderFrontend('app/spot/page.js', options);
  assert.match(detail.match(/class="pcard-price spotprice reported"[\s\S]*?<\/div>/)[0], /Reported LKR 1,200 to 1,800 pp \(estimate\)/);
  const owner = { ...spot, price_min: 800, price_max: 800 };
  const curated = await renderFrontend('components/SpotCard.js', { ...options, props: { spot: owner } });
  assert.match(curated, /LKR 800/);
  assert.doesNotMatch(curated.match(/class="pcard-link"[^>]*>([\s\S]*?)<\/a>/)[1], /Reported/);
});

test('long menus preserve option caveats and put extra items behind native disclosure', async () => {
  const data = { ...entry, spend: null, items: Array.from({ length: 30 }, (_, i) => ({ ...items[2], item: `Test menu dish ${i}`, priceNote: 'Shown menu price; options may vary' })) };
  const options = await priceRenderOptions(spot, data);
  const html = await renderFrontend('components/PublicPrices.js', { ...options, props: { spot } });
  assert.match(html, /Shown menu price; options may vary/);
  assert.match(html, /<details/);
  assert.match(html, /View remaining 22 menu items/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
});

test('menu item evidence never infers spend, invalid evidence renders nothing, and strict-budget filters reject reported estimates', async () => {
  const itemData = { ...entry, spend: null, items: [...items, { ...items[0], item: 'bad-zero', price: 0 }, { ...items[0], item: 'bad-link', sourceUrl: 'https://venue.example.com/menu?token=secret' }] };
  const options = await priceRenderOptions(spot, itemData);
  assert.equal(options.utils.avgPrice(spot), 2000);
  assert.equal(options.utils.priceLabel(spot), 'Prices not added yet');
  const html = await renderFrontend('components/PublicPrices.js', { ...options, props: { spot } });
  assert.doesNotMatch(html, /Reported spend per person|bad-zero|bad-link|token=secret/);
  assert.match(html, /Delivery menu prices/);
  const bad = await priceRenderOptions(spot, { ...itemData, items: [], spend: { ...entry.spend, min: 0 } });
  assert.equal(await renderFrontend('components/PublicPrices.js', { ...bad, props: { spot } }), '');
  const { utils } = await loadPriceModules({ [spot.id]: entry });
  const owner = { ...spot, id: 'owner', price_min: 1000, price_max: 1000 };
  const home = await renderFrontend('app/page.js', { utils, spots: [spot, owner], state: { 7: '2500' } });
  assert.deepEqual([...home.matchAll(/data-spot="([^"]+)"/g)].map(m => m[1]), ['owner']);
});
