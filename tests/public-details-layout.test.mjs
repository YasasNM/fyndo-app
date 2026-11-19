// Real JSX + production CSS in installed Chrome; no app/network data calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtilsSource } from './load-utils.mjs';
import { readFile, mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { renderFrontend } from './render-frontend.mjs';

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let browserAvailable = true;
try { await access(chrome); } catch { browserAvailable = false; }

import { measureChrome } from './chrome-layout.mjs';

test('public facts fit 390px and 1280px in both themes, preserving split schedule whitespace', { skip: !browserAvailable }, async () => {
  const scratch = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'fyndo-public-layout-'));
  try {
    const spot = { id: 'layout-fixture', name: 'Neighborhood Kitchen', about: 'Owner-written About.', category: 'Restaurant', area: 'Colombo', moods: [], photos: [] };
    const url = `https://venue.example.com/${'longmenupath'.repeat(35)}`;
    const data = { [spot.id]: { id: spot.id, name: spot.name, facts: [
      { key: 'menu', label: 'Menu', value: url, sourceUrl: url, sourceLabel: 'Venue website' },
      { key: 'opening_hours', label: 'Opening hours (as reported)', value: 'Mo-Fr 11:00-14:00,18:00-22:00;\nSa 10:00-23:00; Su off', sourceUrl: url, sourceLabel: 'Venue website' },
    ], sources: [{ url, label: 'Venue website', kind: 'official', retrievedAt: '2026-11-19T09:30:00Z' }] } };
    const helperSource = (await readFile(new URL('../lib/publicDetails.js', import.meta.url), 'utf8')).replace(/import registry from "\.\/publicDetails.json";/, `const registry = ${JSON.stringify(data)};`);
    const helper = await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`);
    const utilsSource = await loadUtilsSource();
    const utils = await import(`data:text/javascript;base64,${Buffer.from(utilsSource).toString('base64')}`);
    const html = await renderFrontend('app/spot/page.js', { spot, utils, overrides: { '@/lib/publicDetails': helper }, realModules: ['@/components/phosphor', '@/components/Icon', '@/components/VenuePhoto', '@/components/PublicVenueDetails'] });
    const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
    for (const theme of ['light', 'dark']) for (const width of [390, 1280]) {
      const fixture = join(scratch, `${theme}-${width}.html`);
      await writeFile(fixture, `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="wrap">${html}</main><script>
        const panel = document.querySelector('.public-details');
        const rect = panel.getBoundingClientRect();
        const output = document.createElement('pre'); output.id = 'layout-output';
        output.textContent = JSON.stringify({ width:innerWidth, scrollWidth:document.documentElement.scrollWidth, left:rect.left, right:rect.right, panelWidth:panel.clientWidth, panelScroll:panel.scrollWidth, whiteSpace:getComputedStyle(document.querySelector('.public-details-value')).whiteSpace });
        document.body.append(output);
      </script></body></html>`);
      const m = await measureChrome(fixture, join(scratch, `profile-${theme}-${width}`), width);
      assert.equal(m.width, width, 'requested viewport');
      assert.ok(m.scrollWidth <= width, `${theme} ${width}: document overflow ${JSON.stringify(m)}`);
      assert.ok(m.left >= 0 && m.right <= width, `${theme} ${width}: panel inside viewport`);
      assert.ok(m.panelScroll <= m.panelWidth, `${theme} ${width}: panel has no hidden overflow`);
      assert.equal(m.whiteSpace, 'pre-wrap', 'source schedules preserve line breaks');
      console.log(`${theme} ${width}px: document=${m.scrollWidth}px, panel=${m.panelWidth}px, scroll=${m.panelScroll}px`);
    }
  } finally { await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); }
});
