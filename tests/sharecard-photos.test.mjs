import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('share artwork loads only the venue URL and stays neutral after missing or failed photos', async () => {
  const source = (await readFile(new URL('../lib/sharecard.js', import.meta.url), 'utf8')).replace(/^import .*;$/gm, '').replace(/export function /g, 'function ');
  const requested = [];
  class ImageFixture {
    set src(url) { requested.push(url); queueMicrotask(() => url.includes('broken') ? this.onerror() : this.onload()); }
  }
  const placePhoto = new Function('Image', 'coverFor', `${source}\nreturn placePhoto;`)(ImageFixture, () => ({ large: '/img/unrelated-food.jpg' }));
  assert.equal(await placePhoto({ photos: [] }), null);
  assert.deepEqual(requested, []);
  assert.equal(await placePhoto({ photos: ['https://example.test/broken.jpg'] }), null);
  assert.deepEqual(requested, ['https://example.test/broken.jpg']);
  assert.ok(await placePhoto({ photos: ['https://example.test/venue.jpg'] }));
  assert.deepEqual(requested, ['https://example.test/broken.jpg', 'https://example.test/venue.jpg']);
});
