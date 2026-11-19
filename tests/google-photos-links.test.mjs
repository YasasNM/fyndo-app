import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtilsSource } from './load-utils.mjs';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../lib/gmaps.js', import.meta.url), 'utf8');
const gmaps = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('photo link opens Maps with the stored place ID and safely encoded name', () => {
  assert.equal(typeof gmaps.photosUrl, 'function');
  const url = new URL(gmaps.photosUrl({ name: 'Café A&B', area: 'Colombo 3', google_place_id: 'ChIJ-example&x=1' }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/search/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('query_place_id'), 'ChIJ-example&x=1');
  assert.equal(url.searchParams.get('query'), 'Café A&B, Colombo 3, Sri Lanka');
  assert.equal(url.searchParams.has('key'), false);
});

test('a place without a Google ID searches its name, category and locality without coordinate text', () => {
  const url = new URL(gmaps.photosUrl({ name: 'Pizza Hut', category: 'Restaurant', area: 'Colombo District (locality unknown)', lat: 6.9095, lng: 79.8510 }));
  assert.equal(url.searchParams.get('query'), 'Pizza Hut Restaurant Colombo District Sri Lanka');
  assert.equal(url.searchParams.has('query_place_id'), false);
});

test('668 regression uses the venue query that succeeds in Maps, not the failing mixed coordinate query', () => {
  const url = new URL(gmaps.photosUrl({ name: '668', category: 'Restaurant', area: 'Colombo District (locality unknown)', lat: 6.9139566, lng: 79.8649163 }));
  assert.equal(url.searchParams.get('query'), '668 Restaurant Colombo District Sri Lanka');
  assert.doesNotMatch(url.searchParams.get('query'), /6\.9139566|79\.8649163|locality unknown/);
});

const utilsSource = await loadUtilsSource();
const utils = await import(`data:text/javascript;base64,${Buffer.from(utilsSource).toString('base64')}`);
const { renderFrontend } = await import('./render-frontend.mjs');
const spot = { id: 'osm-node-123', name: 'Imported restaurant', area: 'Colombo 3', category: 'Restaurant', lat: 6.9, lng: 79.85, moods: [], photos: [], price_min: 0, price_max: 0, open_time: null, close_time: null };

test('every card renders a separate external Maps photo link without nesting anchors', async () => {
  for (const s of [spot, { ...spot, photos: ['https://example.test/real.jpg'], google_place_id: 'ChIJ-example' }]) {
    const html = await renderFrontend('components/SpotCard.js', { utils, props: { spot: s } });
    assert.match(html, /View photos on Google Maps/);
    assert.ok(html.includes(gmaps.photosUrl(s).replaceAll('&', '&amp;')));
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    const mainAnchor = html.match(/<a\b[^>]*class="pcard-link"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '';
    assert.doesNotMatch(mainAnchor, /<a\b/);
  }
});

test('a detail page offers the external photo link and tells visitors to choose Photos', async () => {
  const html = await renderFrontend('app/spot/page.js', { utils, spot });
  assert.match(html, /View photos on Google Maps/);
  assert.ok(html.includes(gmaps.photosUrl(spot).replaceAll('&', '&amp;')));
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Opens Google Maps; choose Photos on the venue page/);
});

test('invalid or missing coordinates fall back to the place name and area', () => {
  for (const coordinates of [{}, {lat:null,lng:null}, {lat:'6.9',lng:'79.85'}, {lat:Infinity,lng:79.85}, {lat:91,lng:79.85}, {lat:6.9,lng:181}, {lat:true,lng:false}]) {
    const url = new URL(gmaps.photosUrl({name:'A & B',area:'Nugegoda',...coordinates}));
    assert.equal(url.searchParams.get('query'), 'A & B Nugegoda Sri Lanka');
  }
});
