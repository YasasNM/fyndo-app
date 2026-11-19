import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtilsSource } from './load-utils.mjs';
import { readFile } from 'node:fs/promises';
import { renderFrontend } from './render-frontend.mjs';
const src = await loadUtilsSource();
const utils = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
export const spot = { id: 'osm-node-123', name: '668', category: 'Restaurant', area: 'Colombo District (locality unknown)', moods: [], photos: [], price_max: 0, open_time: null, close_time: null };

test('card actions share a normal-flow footer outside the primary anchor', async () => {
  const html = await renderFrontend('components/SpotCard.js', { utils, props: { spot, pick: { on: false, toggle() {} }, save: { on: false, toggle() {} } } });
  const footer = html.match(/<div class="pcard-actions"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(footer, 'a shared action footer must exist');
  assert.match(footer, /View photos on Google Maps/);
  assert.match(footer, /class="pcard-pick"/);
  const anchor = html.match(/class="pcard-link"[^>]*>([\s\S]*?)<\/a>/)[1];
  assert.doesNotMatch(anchor, /<button|<a\b|pcard-actions/);
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css.match(/\.pcard-pick\s*\{([^}]+)/)[1], /position:\s*absolute|bottom:/);
  assert.match(css.match(/\.pcard-actions\s*\{([^}]+)/)[1], /flex-wrap:\s*wrap/);
});

test('card media displays only actual venue photos, never category examples or Google fallback requests', async () => {
  for (const s of [spot, { ...spot, photos: ['https://example.test/venue.jpg'], google_place_id: 'google-id' }]) {
    const html = await renderFrontend('components/SpotCard.js', { utils, exportName: 'CardMedia', props: { spot: s }, realModules: ['@/components/VenuePhoto'], overrides: { '@/lib/coverPhotos': { coverFor: () => ({ src: '/img/unrelated-food.jpg', real: false }) } } });
    assert.doesNotMatch(html, /unrelated-food|Example photo|\/api\/cover/);
    if (!s.photos.length) assert.match(html, /No venue photo/);
    else assert.match(html, /https:\/\/example.test\/venue.jpg/);
  }
});

test('failed venue URLs show a neutral state and changing the URL restores the photo', async () => {
  const src = 'https://example.test/venue.jpg';
  const failed = await renderFrontend('components/VenuePhoto.js', { props: { src }, state: { 0: src } });
  assert.match(failed, /No venue photo/);
  assert.doesNotMatch(failed, /<img\b/);
  const replacement = await renderFrontend('components/VenuePhoto.js', { props: { src: 'https://example.test/replacement.jpg' }, state: { 0: src } });
  assert.match(replacement, /replacement.jpg/);
});

test('detail page always shows a neutral hero without venue photos, even with a Google ID', async () => {
  for (const s of [spot, { ...spot, google_place_id: 'google-id' }]) {
    const html = await renderFrontend('app/spot/page.js', { utils, spot: s, realModules: ['@/components/VenuePhoto'], overrides: { '@/lib/coverPhotos': { coverFor: () => ({ large: '/img/unrelated-food.jpg', real: false }) } } });
    assert.match(html, /No venue photo/);
    assert.doesNotMatch(html, /unrelated-food|Example photo|Video coming soon/);
  }
});

test('deal tiles use venue photos or a neutral state, never example dishes', async () => {
  for (const s of [spot, { ...spot, photos: ['https://example.test/venue.jpg'] }]) {
    const html = await renderFrontend('components/TodayDeals.js', { utils, props: { spots: [{ ...s, deal: { title: 'Lunch special' } }] }, state: { 0: new Date(2026, 0, 1, 12) }, realModules: ['@/lib/deals', '@/components/VenuePhoto'], overrides: { '@/lib/coverPhotos': { coverFor: () => ({ src: '/img/unrelated-food.jpg', real: false }) } } });
    assert.doesNotMatch(html, /unrelated-food|Example photo/);
    assert.match(html, s.photos.length ? /venue.jpg/ : /No venue photo/);
  }
});

test('photo galleries retain venue URLs and give empty galleries the same neutral state', async () => {
  for (const photos of [[], [{ url: 'https://example.test/venue.jpg' }]]) {
    const html = await renderFrontend('components/PhotoGallery.js', { props: { photos, placeName: spot.name }, realModules: ['@/components/VenuePhoto'] });
    assert.match(html, photos.length ? /venue.jpg/ : /No venue photo/);
  }
});

test('legacy single Google photo uses the same failure-aware photo component and retains credit', async () => {
  const g = { name: spot.name, photo: { name: 'photo-reference', author: 'Photo contributor', mapsUrl: 'https://example.test/maps' }, hours: [], openNow: null };
  const html = await renderFrontend('components/GooglePanel.js', { state: { 0: g }, props: { placeId: 'fixture' }, realModules: ['@/components/VenuePhoto', '@/components/PhotoGallery'], overrides: { '@/lib/api': { photoSrc: () => 'https://example.test/venue.jpg' } } });
  assert.match(html, /venue-photo/);
  assert.match(html, /Photo contributor/);
  assert.match(html, /venue.jpg/);
});

test('the real image error handler transitions a failed venue photo to the neutral state', async () => {
  const state = {};
  const events = [];
  const options = { props: { src: 'https://example.test/broken.jpg' }, state, imageErrors: events };
  const before = await renderFrontend('components/VenuePhoto.js', options);
  assert.match(before, /broken.jpg/);
  assert.equal(events.length, 1, 'capture the rendered image error handler');
  events[0]();
  const after = await renderFrontend('components/VenuePhoto.js', options);
  assert.match(after, /No venue photo/);
  assert.doesNotMatch(after, /<img\b/);
});

test('actual venue photo URLs and their credit survive on details and compact thumbnails', async () => {
  const src = 'https://example.test/venue.jpg';
  const s = { ...spot, photos: [src], photo_info: { [src]: { source: 'website', credit: 'Neighborhood Kitchen', link: 'https://example.test/' } } };
  const realModules = ['@/lib/photoInfo', '@/components/VenuePhoto', '@/components/PhotoGallery'];
  const detail = await renderFrontend('app/spot/page.js', { utils, spot: s, realModules });
  assert.match(detail, /https:\/\/example.test\/venue.jpg/);
  assert.match(detail, /Neighborhood Kitchen \(their website\)/);
  assert.match(detail, /referrerPolicy="no-referrer"/i);
  for (const variant of [s, spot]) {
    const thumb = await renderFrontend('components/SpotCard.js', { utils, exportName: 'Thumb', props: { spot: variant, className: 'mini' }, realModules });
    assert.match(thumb, variant.photos.length ? /venue.jpg/ : /No venue photo/);
  }
});
