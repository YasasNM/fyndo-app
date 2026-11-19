// Network-free fixture with actual JSX and production CSS, not production prices.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPriceModules } from './load-utils.mjs';
import { renderFrontend } from './render-frontend.mjs';
import { measureChrome } from './chrome-layout.mjs';
let available = true;
try { await access(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'); } catch { available = false; }

test('reported prices and card labels wrap at 390px and 1280px in light and dark without action overlap', { skip: !available }, async () => {
  const scratch = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'fyndo-prices-layout-'));
  try {
    const spot = { id: 'layout-fixture', name: 'Local Kitchen', category: 'Restaurant', area: 'Colombo', moods: [], photos: [], price_min: 0, price_max: 0 };
    const source = { sourceUrl: `https://venue.example.com/${'longmenu'.repeat(35)}`, sourceLabel: 'VeryLongMenuSource'.repeat(25), retrievedAt: '2026-11-19T09:30:00Z', quote: 'Test fixture menu price evidence.' };
    const data = { id: spot.id, name: spot.name, identityEvidence: { basis: 'exact_branch' }, spend: { min: 1200, max: 1800, currency: 'LKR', unit: 'per_person', channel: 'reported', estimated: true, ...source }, items: [{ item: 'VeryLongDishName'.repeat(25), price: 500, currency: 'LKR', unit: 'item', channel: 'delivery', ...source }], sources: [{ url: source.sourceUrl, label: source.sourceLabel, retrievedAt: source.retrievedAt }] };
    const { utils, publicPrices } = await loadPriceModules({ [spot.id]: data });
    const options = { spot, utils, realModules: ['@/components/VenuePhoto', '@/components/SpotCard', '@/components/PublicPrices'], overrides: { '@/lib/publicPrices': publicPrices } };
    const detail = await renderFrontend('app/spot/page.js', options);
    const card = await renderFrontend('components/SpotCard.js', { ...options, props: { spot, pick: { on: false, toggle() {} } } });
    const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
    for (const theme of ['light', 'dark']) for (const width of [390, 1280]) {
      const fixture = join(scratch, `${theme}-${width}.html`);
      await writeFile(fixture, `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="wrap">${detail}<div style="width:260px;max-width:100%">${card}</div></main><script>
        const panel = document.querySelector('.public-prices');
        const rect = panel.getBoundingClientRect();
        const prices = [...document.querySelectorAll('.pcard-price.reported')].map(el => ({width:el.clientWidth, scroll:el.scrollWidth, whiteSpace:getComputedStyle(el).whiteSpace}));
        const a = document.querySelector('.pcard-actions a').getBoundingClientRect(), b = document.querySelector('.pcard-pick').getBoundingClientRect();
        const link = panel.querySelector('a');
        const output = document.createElement('pre'); output.id = 'layout-output';
        output.textContent = JSON.stringify({width:innerWidth, scrollWidth:document.documentElement.scrollWidth, left:rect.left, right:rect.right, panelWidth:panel.clientWidth, panelScroll:panel.scrollWidth, prices, overlaps:a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom, safeLink:link.target==='_blank'&&link.rel.includes('noopener')&&link.rel.includes('noreferrer')});
        document.body.append(output);
      </script></body></html>`);
      const m = await measureChrome(fixture, join(scratch, `${theme}-${width}-profile`), width);
      assert.equal(m.width, width);
      assert.ok(m.scrollWidth <= width, `${theme} ${width}: document overflow ${JSON.stringify(m)}`);
      assert.ok(m.panelScroll <= m.panelWidth && m.left >= 0 && m.right <= width, `${theme} ${width}: panel overflow ${JSON.stringify(m)}`);
      assert.ok(m.prices.every(p => p.scroll <= p.width && p.whiteSpace === 'normal'), 'reported labels wrap normally');
      assert.equal(m.overlaps, false, 'card footer actions do not overlap');
      assert.equal(m.safeLink, true, 'source is a separate safe outbound link');
      console.log(`prices ${theme} ${width}px: panel=${m.panelWidth}px scroll=${m.panelScroll}px actions overlap=${m.overlaps}`);
    }
  } finally { await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); }
});
