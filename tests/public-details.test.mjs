import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtilsSource } from './load-utils.mjs';
import { readFile } from 'node:fs/promises';
import { renderFrontend } from './render-frontend.mjs';

const source = { url: 'https://www.openstreetmap.org/node/123', label: 'OpenStreetMap', retrievedAt: '2026-11-19T09:30:00Z', kind: 'osm' };
const entry = { id: 'venue-123', name: 'Neighborhood Kitchen', facts: [{ key: 'address', label: 'Address', value: '42 Market Road', sourceUrl: source.url, sourceLabel: source.label }], sources: [source] };
const registry = { [entry.id]: entry };
async function helpers(data = registry) {
  const source = (await readFile(new URL('../lib/publicDetails.js', import.meta.url), 'utf8')).replace(/import\s+registry\s+from\s+["']\.\/publicDetails.json["'];?/, `const registry = ${JSON.stringify(data)};`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

async function renderDetails(data = registry, spot = { id: entry.id, name: entry.name }, options = {}) {
  return renderFrontend('components/PublicVenueDetails.js', { props: { spot, ...options }, overrides: { '@/lib/publicDetails': await helpers(data) } });
}

test('real public details JSX renders sourced facts and raw full weekly hours with ODbL credit', async () => {
  const weekly = 'Mo-Fr 11:00-14:00,18:00-22:00; Sa 10:00-23:00; Su off';
  const facts = ['address', 'cuisine', 'opening_hours', 'services', 'wheelchair', 'phone', 'menu', 'payment'].map(key => ({ key, label: key === 'opening_hours' ? 'Opening hours (as reported)' : key, value: key === 'opening_hours' ? weekly : key === 'menu' ? 'https://venue.example.com/menu.pdf' : `${key} from source`, sourceUrl: source.url, sourceLabel: source.label }));
  const html = await renderDetails({ [entry.id]: { ...entry, facts } });
  for (const fact of facts) assert.ok(html.includes(fact.value), fact.key);
  assert.match(html, /<dl/);
  assert.match(html, /OpenStreetMap/);
  assert.match(html, /As reported by the sources below/);
  assert.match(html, /Retrieved <time dateTime="2026-11-19T09:30:00Z">2026-11-19T09:30:00Z<\/time>/);
  assert.match(html, /href="https:\/\/venue.example.com\/menu.pdf" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /OpenStreetMap contributors/);
  assert.match(html, /https:\/\/opendatacommons.org\/licenses\/odbl\/1-0\//);
  assert.doesNotMatch(html, /verified|independently checked|open now|daily|<img|<iframe/i);
});

test('spot page includes exact-ID public facts alongside unchanged owner About and review attribution', async () => {
  const utilsSource = await loadUtilsSource();
  const utils = await import(`data:text/javascript;base64,${Buffer.from(utilsSource).toString('base64')}`);
  const spot = { id: entry.id, name: entry.name, about: 'Our owner-written seasonal menu.', moods: [], photos: [], category: 'Restaurant', area: 'Colombo' };
  const options = { utils, spot, realModules: ['@/components/PublicVenueDetails'], overrides: { '@/lib/publicDetails': await helpers() } };
  const html = await renderFrontend('app/spot/page.js', options);
  assert.match(html, /Our owner-written seasonal menu\./);
  assert.match(html, /42 Market Road/);
  assert.match(html, /Public venue details/);
  assert.equal((html.match(/OpenStreetMap contributors/g) || []).length, 1);
  assert.doesNotMatch(html, /Based on Google reviews|Listed on OpenStreetMap/);
  const osmId = 'osm-123';
  const osm = await renderFrontend('app/spot/page.js', { ...options, spot: { ...spot, id: osmId }, overrides: { '@/lib/publicDetails': await helpers({ [osmId]: { ...entry, id: osmId } }) } });
  assert.match(osm, /42 Market Road/);
  assert.equal((osm.match(/OpenStreetMap contributors/g) || []).length, 1);
});

test('missing, empty and malformed public details render nothing; unsafe values stay escaped plain text', async () => {
  for (const data of [{}, { [entry.id]: { ...entry, facts: [] } }, { [entry.id]: { ...entry, facts: [null, { value: 42 }] } }]) assert.equal(await renderDetails(data), '');
  const unsafe = 'javascript:alert(1)<img src=x onerror=alert(2)>';
  const html = await renderDetails({ [entry.id]: { ...entry, facts: [{ ...entry.facts[0], key: 'website', label: '<script>Website</script>', value: unsafe }, { ...entry.facts[0], key: 'menu', value: 'http://192.168.1.2/menu' }, { ...entry.facts[0], sourceUrl: 'data:text/html,unsafe', value: 'must not render' }] } });
  assert.match(html, /&lt;script&gt;Website&lt;\/script&gt;/);
  assert.match(html, /javascript:alert\(1\)&lt;img/);
  assert.match(html, /http:\/\/192.168.1.2\/menu/);
  assert.doesNotMatch(html, /href="(?:javascript:|data:|http:\/\/192)|<img|<script|must not render/);
  const official = await renderDetails({ [entry.id]: { ...entry, sources: [{ ...source, kind: 'official', label: 'Venue website' }] } });
  assert.doesNotMatch(official, /contributors|ODbL/);
  const noTime = await renderDetails({ [entry.id]: { ...entry, sources: [{ ...source, retrievedAt: '' }] } });
  assert.doesNotMatch(noTime, /Retrieved|<time/);
});

test('spot page rejects unsafe owner website links without changing safe owner precedence', async () => {
  const utilsSource = await loadUtilsSource();
  const utils = await import(`data:text/javascript;base64,${Buffer.from(utilsSource).toString('base64')}`);
  const base = { id: entry.id, name: 'Current renamed venue', moods: [], photos: [], category: 'Restaurant', area: 'Colombo' };
  for (const website of ['javascript:alert(1)', 'http://127.0.0.1/menu', 'http://192.168.1.2/menu', 'https://user:pass@example.com']) {
    const html = await renderFrontend('app/spot/page.js', { utils, spot: { ...base, website }, realModules: ['@/components/OfficialLinks', '@/components/PublicVenueDetails'], overrides: { '@/lib/publicDetails': await helpers() } });
    assert.ok(!html.includes(`href="${website}"`), website);
    assert.match(html, /Current renamed venue/);
    assert.match(html, /42 Market Road/);
    assert.doesNotMatch(html, /Neighborhood Kitchen/);
  }
  const website = 'https://owner.example.com/menu';
  const html = await renderFrontend('app/spot/page.js', { utils, spot: { ...base, website }, realModules: ['@/components/OfficialLinks'] });
  assert.ok(html.includes(`href="${website}"`));
});

test('outbound public detail links accept only public HTTP(S) URLs', async () => {
  const { safePublicUrl } = await helpers();
  for (const url of ['https://venue.example.com/menu.pdf?lang=en&v=2', 'http://www.openstreetmap.org/node/123']) assert.equal(safePublicUrl(url), url);
  for (const url of [null, {}, '', '//example.com', 'javascript:alert(1)', 'data:text/html,hello', 'https://', 'https://user:pass@example.com', 'https://localhost/menu', 'http://127.0.0.1', 'http://2130706433', 'http://0x7f000001', 'https://10.0.0.1', 'https://192.168.1.2', 'https://169.254.169.254', 'https://[::1]', 'https://[::ffff:127.0.0.1]', 'https://venue.local', 'https://venue.internal', 'https://localhost.', 'https://intranet', 'https://example.com\\\\evil', 'https://example.com/\nmenu']) assert.equal(safePublicUrl(url), null, String(url));
});

test('public details use only the exact own registry ID and reject malformed entries', async () => {
  const { publicDetailsFor } = await helpers();
  assert.deepEqual(publicDetailsFor({ id: entry.id, name: entry.name }), entry);
  for (const spot of [null, {}, { id: 'other', name: entry.name }, { id: '__proto__' }, { id: 'toString' }]) assert.equal(publicDetailsFor(spot), null);
  for (const data of [null, [], { [entry.id]: null }, { [entry.id]: { ...entry, id: 'other' } }, { [entry.id]: { ...entry, facts: 'bad' } }]) assert.equal((await helpers(data)).publicDetailsFor({ id: entry.id }), null);
});
