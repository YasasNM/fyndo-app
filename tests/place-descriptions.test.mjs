import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtilsSource } from './load-utils.mjs';
import { readFile } from 'node:fs/promises';
import { renderFrontend } from './render-frontend.mjs';
const entries = JSON.parse(await readFile(new URL('../lib/descriptionReviews.json', import.meta.url), 'utf8'));
const boilerplate = 'Listed on OpenStreetMap; not independently verified by Fyndo. Prices and opening hours unconfirmed. © OSM Source: example';
const base = { id: 'osm-unreviewed', name: 'Neighborhood Kitchen', category: 'Restaurant', area: 'Colombo District (locality unknown)', about: boilerplate, moods: [], photos: [] };
async function descriptions() {
  const source = (await readFile(new URL('../lib/placeDescriptions.js', import.meta.url), 'utf8')).replace(/import\s+reviews\s+from\s+["']\.\/descriptionReviews.json["'];?/, `const reviews = ${JSON.stringify(entries)};`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('old OSM boilerplate becomes venue-specific facts without claiming reviews or confirmation', async () => {
  const { descriptionFor } = await descriptions();
  assert.equal(descriptionFor(base), 'Neighborhood Kitchen is a restaurant in Colombo District.');
  assert.equal(descriptionFor({ ...base, category: 'Activity', area: 'Dehiwala' }), 'Neighborhood Kitchen is an activity in Dehiwala.');
  assert.equal(descriptionFor({ ...base, about: '' }), 'Neighborhood Kitchen is a restaurant in Colombo District.');
  assert.equal(descriptionFor({ name: 'A & B' }), 'A & B is a place.');
});

test('curated descriptions remain verbatim unless the exact ID has a sourced override', async () => {
  const { descriptionFor, descriptionReviewSource } = await descriptions();
  const curated = 'A family-run kitchen with a rotating lunch menu.';
  assert.equal(descriptionFor({ ...base, about: curated }), curated);
  assert.equal(descriptionFor({ ...base, about: `Locals say: ${boilerplate}` }), `Locals say: ${boilerplate}`);
  for (const entry of entries) {
    assert.equal(descriptionFor({ ...base, id: entry.id }), entry.description);
    assert.deepEqual(descriptionReviewSource({ id: entry.id }), entry);
    assert.equal(descriptionReviewSource({ id: `${entry.id}-other`, name: entry.name }), null);
  }
});

test('owner-edited About is preserved and is not falsely attributed to an older Google summary', async () => {
  const { descriptionFor, descriptionReviewSource } = await descriptions();
  const spot = { ...base, id: entries[0].id, about: 'Our family kitchen now serves a seasonal lunch menu.' };
  assert.equal(descriptionFor(spot), spot.about);
  assert.equal(descriptionReviewSource(spot), null);
  assert.equal(descriptionFor({ ...spot, about: entries[0].description }), entries[0].description);
  assert.deepEqual(descriptionReviewSource({ ...spot, about: entries[0].description }), entries[0]);
});

test('detail renders clean About with review source only on exact reviewed IDs and keeps legal credit', async () => {
  const utilsSource = await loadUtilsSource();
  const utils = await import(`data:text/javascript;base64,${Buffer.from(utilsSource).toString('base64')}`);
  const actual = await descriptions();
  for (const s of [base, ...entries.map(e => ({ ...base, id: e.id, name: e.name }))]) {
    const html = await renderFrontend('app/spot/page.js', { utils, spot: s, overrides: { '@/lib/placeDescriptions': actual } });
    assert.doesNotMatch(html, /Listed on OpenStreetMap|Prices and opening hours unconfirmed|Hours and prices may not be added yet/);
    assert.match(html, /OpenStreetMap contributors/);
    assert.match(html, /https:\/\/opendatacommons.org\/licenses\/odbl\/1-0\//);
    assert.match(html, /Hours not added yet|Prices not added yet/);
    const entry = entries.find(e => e.id === s.id);
    if (entry) {
      assert.match(html, /Based on Google reviews/);
      assert.ok(html.includes(entry.sourceUrl.replaceAll('&', '&amp;')));
      assert.match(html, /target="_blank" rel="noopener noreferrer"[^>]*>Source<\/a>/);
    } else assert.doesNotMatch(html, /Based on Google reviews/);
  }
});
