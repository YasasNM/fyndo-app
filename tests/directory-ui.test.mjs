import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFrontend } from './render-frontend.mjs';
import { loadPriceModules } from './load-utils.mjs';
const { utils } = await loadPriceModules({});
import { createRequire } from 'node:module';
const React = createRequire(import.meta.url)('react');

test('onboarding does not auto-open on a fresh visit; explicit help replay remains available', async () => {
  const prior = { window: globalThis.window, localStorage: globalThis.localStorage, setTimeout: globalThis.setTimeout };
  try {
    globalThis.localStorage = { getItem: () => null };
    globalThis.setTimeout = (fn) => { fn(); return 1; };
    for (const query of ['', '?tour=1']) {
      const effects = [], updates = [];
      globalThis.window = { location: { search: query } };
      const html = await renderFrontend('components/Tour.js', { overrides: { react: { ...React, useEffect: fn => effects.push(fn), useState: () => [-1, value => updates.push(value)] } } });
      assert.equal(html, '');
      effects[0]();
      assert.deepEqual(updates, query ? [0] : [], query ? 'explicit replay opens help' : 'fresh visit remains unobstructed');
    }
  } finally { Object.assign(globalThis, prior); }
});
test('natural-language search is retained with plain fallback copy', async () => {
  const html = await renderFrontend('components/AskFyndo.js', { state: { 2: { f: { reply: 'Matching places', ai: false }, list: [] } }, overrides: { './Icon': { Ico: () => null } } });
  assert.match(html, /aria-label="Ask Fyndo"/);
  assert.match(html, /Local keyword match/);
  assert.doesNotMatch(html, /AI is off/);
});

const spots = [
  { id: 'kitchen', name: 'Local Kitchen', area: 'Colombo 3', category: 'Restaurant', moods: [], photos: [], price_min: 800, price_max: 1200, open_time: null, close_time: null },
  { id: 'tea', name: 'Tea Room', area: 'Colombo 7', category: 'Café', moods: [], photos: [], price_min: 0, price_max: 0, open_time: null, close_time: null },
];

test('directory exposes search and core filters before secondary tools on first visit', async () => {
  const html = await renderFrontend('app/page.js', { utils, spots });
  assert.match(html, /Restaurants and more in Colombo/);
  for (const label of ['Search by name or dish', 'Area', 'Budget', 'Type', 'Sort by']) assert.ok(html.includes(`aria-label="${label}"`), `${label} available without opening filters`);
  assert.ok(html.indexOf('Search by name or dish') < html.indexOf('More filters'));
  assert.match(html, /2 spots found/);
  assert.ok(html.indexOf('Describe what you’re looking for') < html.indexOf('data-spot="kitchen"'), 'optional natural-language search is discoverable above results');
  assert.ok(html.indexOf('data-spot="kitchen"') < html.indexOf('aria-label="Tools"'), 'results precede utilities');
  assert.doesNotMatch(html, /suggest-img|hero-photo|Where to tonight|whole night planned in a minute/);
});

test('existing Home state indexes still drive search, strict budget and area', async () => {
  const search = await renderFrontend('app/page.js', { utils, spots, state: { 0: 'tea' } });
  assert.match(search, /1 spot found/);
  assert.match(search, /data-spot="tea"/);
  assert.doesNotMatch(search, /data-spot="kitchen"/);
  const budget = await renderFrontend('app/page.js', { utils, spots, state: { 7: '2500' } });
  assert.match(budget, /data-spot="kitchen"/);
  assert.doesNotMatch(budget, /data-spot="tea"/, 'unknown price excluded from strict budget');
  const area = await renderFrontend('app/page.js', { utils, spots, state: { 6: 'Colombo 7' } });
  assert.match(area, /data-spot="tea"/);
  assert.doesNotMatch(area, /data-spot="kitchen"/);
});
