import assert from 'node:assert/strict';
import test from 'node:test';
import { runSpotMapQa } from './spot-map-browser.mjs';

// This control removes only initial animation to isolate the independently reproduced resize race.
test('SpotMap cleanup cancels its pending resize before React detaches the map', { timeout: 15000 }, async () => {
  const evidence = await runSpotMapQa({ probe: 'without-initial-animation', label: 'resize-regression' });
  assert.equal(evidence.checks[0].pending50, 1, 'unmount happens while the owned 50ms resize is still pending');
  assert.deepEqual(evidence.exceptions, []);
  const after = evidence.checks[1];
  assert.deepEqual(after.errors, []);
  assert.equal(after.pending50, 0);
  assert.equal(after.trace.filter(t => t.method === 'invalidateSize' && !t.alive).length, 0);
});

test('SpotMap navigation tears down active zoom without late Leaflet callbacks or lost map behavior', { timeout: 45000 }, async () => {
  const evidence = await runSpotMapQa();
  assert.deepEqual(evidence.exceptions, [], 'no uncaught exceptions, including Leaflet zoom completion after navigation');
  for (const check of evidence.checks) {
    assert.deepEqual(check.errors, [], check.name);
    assert.equal(check.trace.filter(t => t.method === 'invalidateSize' && !t.alive).length, 0, `${check.name}: no delayed resize of a removed map`);
  }
  const after = evidence.checks.find(c => c.name === 'after-initial-navigation');
  assert.equal(after.alive, false);
  assert.equal(after.pending50, 0);
  assert.ok(after.trace.some(t => t.method === '_onZoomTransitionEnd' && t.alive && t.animating), 'active zoom finishes before pane removal');
  assert.ok(after.trace.some(t => t.method === '_onZoomTransitionEnd' && !t.alive && !t.animating), 'real fallback timer executes safely after removal, not suppressed');
  const bounds = evidence.checks.find(c => c.name === 'multiple-pins-and-location-bounds');
  assert.equal(bounds.containsAll, true);
  assert.equal(bounds.markers, 2);
  assert.deepEqual(bounds.popups, [true, true]);
  assert.match(bounds.attribution, /OpenStreetMap/);
  assert.equal(bounds.wheel, false);
  assert.ok(bounds.zoom <= 16);
  const zoom = evidence.checks.find(c => c.name === 'user-zoom-control');
  assert.equal(zoom.zoom, bounds.zoom + 1, 'user zoom remains available');
  const resize = evidence.checks.find(c => c.name === 'container-resize');
  assert.equal(resize.size.x, 480);
  const single = evidence.checks.find(c => c.name === 'list-to-single-update');
  assert.equal(single.markers, 1);
  assert.deepEqual(single.popups, [false]);
  assert.equal(single.zoom, 16);
  assert.ok(Math.abs(single.center.lat - 6.9) < 0.0001);
  assert.ok(Math.abs(single.center.lng - 79.86) < 0.0001);
});
