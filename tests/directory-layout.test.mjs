import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { renderFrontend } from './render-frontend.mjs';
import { loadPriceModules } from './load-utils.mjs';
import { measureChrome } from './chrome-layout.mjs';
const output = 'C:/Users/yasas/AppData/Local/hermes/cache/scratch/fyndo-expansion/ui';
const { utils } = await loadPriceModules({});
const spots = [
  { id: 'kitchen', name: 'Neighbourhood Kitchen with a Longer Branch Name', area: 'Colombo 3', category: 'Restaurant', moods: [], photos: [], price_min: 800, price_max: 1200, open_time: null, close_time: null },
  { id: 'tea', name: 'Tea Room', area: 'Colombo 7', category: 'Café', moods: [], photos: [], price_min: 0, price_max: 0, open_time: null, close_time: null },
];

test('directory geometry: usable search, compact honest cards and solid surfaces at three widths in both themes', async () => {
  await mkdir(output, { recursive: true });
  const scratch = await mkdtemp(join(process.env.TMPDIR || output, 'directory-layout-'));
  try {
    const home = await renderFrontend('app/page.js', { utils, spots, realModules: ['@/components/phosphor', '@/components/Icon', '@/components/VenuePhoto', '@/components/SpotCard'] });
    const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
    const results = [];
    for (const theme of ['light', 'dark']) for (const width of [390, 762, 1280]) {
      const fixture = join(output, `fixture-${theme}-${width}.html`);
      await writeFile(fixture, `<!doctype html><html data-theme="${theme}" data-intro="seen"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><header class="topbar"><div class="topbar-in"><a class="brand">Fyndo</a></div></header><main class="wrap"><div class="page-enter">${home}</div></main><script>
      const rect = el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height,width:r.width}; };
      const cards=[...document.querySelectorAll('.grid > .pcard')];
      const measures={columns:getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length,width:innerWidth,scroll:document.documentElement.scrollWidth, search:rect(document.querySelector('[type="search"]')),header:rect(document.querySelector('.topbar')), images:cards.map(c=>rect(c.querySelector('.pcard-media'))), actions:cards.map(c=>{const a=rect(c.querySelector('.pcard-actions a')),b=rect(c.querySelector('.pcard-pick'));return {overlap:a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom, height:b.height};}), surfaces:cards.map(c=>getComputedStyle(c.querySelector('.no-venue-photo')).backgroundImage), names:cards.map(c=>({bottom:c.querySelector('h3').getBoundingClientRect().bottom,width:c.querySelector('h3').clientWidth,scroll:c.querySelector('h3').scrollWidth})), searchBackground:getComputedStyle(document.querySelector('[type="search"]')).backgroundImage};
      const output=document.createElement('pre');output.id='layout-output';output.hidden=true;output.textContent=JSON.stringify(measures);document.body.append(output);
      </script></body></html>`);
      const m = await measureChrome(fixture, join(scratch, `${theme}-${width}`), width);
      results.push({ theme, ...m });
      assert.equal(m.width, width);
      assert.equal(m.columns, width === 390 ? 1 : width === 762 ? 2 : 3, 'production page wrapper retains readable card widths');
      assert.ok(m.scroll <= width, `${theme} ${width}: document overflow`);
      assert.ok(m.search.top >= m.header.bottom && m.search.bottom < 360, 'search is near the top, below sticky header');
      assert.ok(m.images.every(i => i.height <= 80), `unknown photos must not dominate cards: ${JSON.stringify(m.images)}`);
      assert.ok(m.surfaces.every(s => s === 'none'), 'missing-photo surfaces are solid, not gradients');
      assert.ok(m.actions.every(a => !a.overlap && a.height >= 40), 'card actions have distinct touch targets');
      assert.ok(m.names.every(n => n.scroll <= n.width), 'long names stay readable without horizontal overflow');
      if (width === 390) assert.ok(m.names[0].bottom <= 730, `first venue name must be visible early: ${m.names[0].bottom}`);
      console.log(`directory ${theme} ${width}: search top=${m.search.top}, media=${m.images[0].height}, overflow=${m.scroll-width}`);
    }
    await writeFile(join(output, 'fixture-geometry.json'), JSON.stringify(results, null, 2));
  } finally { await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); }
});
