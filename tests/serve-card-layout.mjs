// Network-free visual fixture: real card JSX and production CSS, no app data calls.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { renderFrontend } from './render-frontend.mjs';
const source = await readFile(new URL('../lib/utils.js', import.meta.url), 'utf8');
const utils = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const spot = { id: 'fixture', name: 'Neighborhood Kitchen', category: 'Restaurant', area: 'Colombo District', moods: [], photos: [], price_max: 0, open_time: null, close_time: null };
const cards = [];
for (const width of [150, 178, 240, 320]) {
  const html = await renderFrontend('components/SpotCard.js', { utils, realModules: ['@/components/phosphor', '@/components/Icon', '@/components/VenuePhoto'], props: { spot, pick: { on: false, toggle() {} }, save: { on: false, toggle() {} } } });
  cards.push(`<section style="width:${width}px"><p>${width}px card</p>${html}</section>`);
}
const document = `<!doctype html><html data-theme="light" data-intro="seen"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main style="padding:16px;display:flex;gap:24px;flex-wrap:wrap">${cards.join('')}</main></body></html>`;
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(document); });
server.listen(0, '127.0.0.1', () => console.log(`Card layout fixture: http://127.0.0.1:${server.address().port}`));
