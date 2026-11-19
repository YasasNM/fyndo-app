// Network-free browser fixture: real React lifecycle, Home JSX and Tour JSX.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { transform } = require('next/dist/build/swc');
const webpackModule = require('next/dist/compiled/webpack/webpack');
webpackModule.init();
const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
export async function onboardingFixture(directory) {
  await mkdir(directory, { recursive: true });
  const sources = {};
  for (const file of ['app/page.js', 'components/Tour.js']) {
    const source = await readFile(join(root, file), 'utf8');
    sources[file] = (await transform(source, { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2020' }, module: { type: 'commonjs' } })).code;
  }
  const entry = join(directory, 'entry.cjs');
  const bundle = join(directory, 'onboarding.js');
  await writeFile(entry, `
const React = require(${JSON.stringify(require.resolve('react'))});
const runtime = require(${JSON.stringify(require.resolve('react/jsx-runtime'))});
const { createRoot } = require(${JSON.stringify(require.resolve('react-dom/client'))});
const { flushSync } = require(${JSON.stringify(require.resolve('react-dom'))});
const utils = require(${JSON.stringify(join(root, 'lib/utils.js'))});
const empty = () => null;
const spots = [{ id: 'tea', name: 'Tea Room', area: 'Colombo 7', category: 'Café', moods: [], photos: [], price_min: 800, price_max: 1200 }];
const modules = {
  react: React, 'react/jsx-runtime': runtime,
  'next/link': { default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest, onClick: e => { e.preventDefault(); history.pushState({}, '', href); } }, children) },
  'next/dynamic': { default: () => empty },
  '@/lib/utils': utils, '@/lib/data': { db: {} },
  '@/lib/hooks': { useSpots: () => ({ spots }), useRatings: () => ({}), usePopular: () => [], useCollections: () => [], useUser: () => null, useLocation: () => ({ pos: null, status: '', ask() {} }), useSaves: () => ({ ids: [], toggle() {} }) },
  '@/lib/weather': { useWeather: () => null },
  '@/lib/seed': { AREAS: ['Colombo 7'], MOODS: [], CATEGORIES: ['Café'] },
  '@/lib/features': { FEATURES: [], OCCASIONS: [] },
  '@/components/SpotCard': { default: ({ spot }) => React.createElement('article', { 'data-spot': spot.id }, spot.name), SkeletonGrid: empty },
  '@/components/Icon': { Ico: empty }, './Icon': { Ico: empty }
};
function load(code) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => ({ __esModule: true, ...(modules[id] || { default: empty }) }), module, module.exports);
  return module.exports;
}
modules['@/components/Tour'] = load(${JSON.stringify(sources['components/Tour.js'])});
const Home = load(${JSON.stringify(sources['app/page.js'])}).default;
// Accelerate delays only; effects, state and DOM events use the real React lifecycle.
const nativeSetTimeout = window.setTimeout.bind(window);
window.setTimeout = (callback, ms, ...args) => nativeSetTimeout(callback, ms / 10, ...args);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { checks: [], errors: [] };
window.addEventListener('error', e => report.errors.push(e.message));
let root;
const container = document.getElementById('app');
const assert = (condition, message) => { if (!condition) throw new Error(message); report.checks.push(message); };
const dialog = () => document.querySelector('[aria-label="Quick tour"]');
const button = text => [...document.querySelectorAll('button, a')].find(el => el.textContent.trim() === text);
const click = text => { const el = button(text); if (!el) throw new Error('Missing control: ' + text); el.click(); };
const mount = () => { root = createRoot(container); flushSync(() => root.render(React.createElement(Home))); };
const unmount = () => { flushSync(() => root.unmount()); };
async function run() {
  history.replaceState({}, '', location.pathname);
  localStorage.clear();
  mount();
  await wait(1100);
  assert(!dialog(), 'fresh visit remains opt-in');
  const input = document.querySelector('input[type="search"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'tea');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(50);
  assert(document.querySelector('input[type="search"]').value === 'tea', 'search updated before Help');
  click('Help');
  await wait(1100);
  assert(!!dialog(), 'Help after initially mounted Home opens tour');
  assert(document.querySelector('input[type="search"]') === input && input.value === 'tea', 'Help preserves mounted Home and search state');
  click('Next'); await wait(50);
  assert(dialog().textContent.includes('Choose what matters'), 'tour advances');
  click('Help'); await wait(1100);
  assert(dialog().textContent.includes('Find a local place'), 'Help restarts an active tour');
  click('Skip tour'); await wait(50);
  assert(!dialog(), 'Skip dismisses tour');
  assert(!document.querySelector('.tour-hi'), 'dismissal removes highlight');
  click('Help'); await wait(1100);
  assert(dialog().textContent.includes('Find a local place'), 'Help replays after dismissal');
  click('Next'); await wait(50); click('Next'); await wait(50); click('Got it'); await wait(50);
  assert(!dialog(), 'completion dismisses tour');
  click('Help'); await wait(1100);
  assert(dialog().textContent.includes('Find a local place'), 'Help replays after completion');
  click('Skip tour'); await wait(50);
  unmount(); mount(); await wait(1100);
  assert(!dialog(), 'fresh visit stays opt-in after previous completion');
  unmount(); history.replaceState({}, '', location.pathname + '?tour=1'); mount(); await wait(1100);
  assert(dialog()?.textContent.includes('Find a local place'), 'direct tour=1 opens tour despite prior completion');
  click('Skip tour'); await wait(1100);
  assert(!dialog(), 'direct tour=1 stays dismissed without a new request');
  click('Help'); await wait(1100);
  assert(dialog()?.textContent.includes('Find a local place'), 'Help replays on direct tour=1 visit');
  assert(report.errors.length === 0, 'no browser runtime errors');
}
run().catch(error => { report.failure = error.message; }).finally(() => {
  document.getElementById('layout-output').textContent = JSON.stringify(report);
});
`);
  await new Promise((resolveBuild, reject) => webpackModule.webpack({
    mode: 'development', devtool: false, target: 'web', entry,
    output: { path: directory, filename: 'onboarding.js' },
    resolve: { modules: [join(root, 'node_modules'), 'node_modules'] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolveBuild()));
  const fixture = join(directory, 'onboarding.html');
  const css = await readFile(join(root, 'app/globals.css'), 'utf8');
  await writeFile(fixture, '<!doctype html><html><head><meta charset="utf-8"><title>Help replay lifecycle QA</title><style>' + css + '</style></head><body><main class="wrap"><div id="app"></div></main><pre id="layout-output"></pre><script src="onboarding.js"></script></body></html>');
  return { fixture, bundle };
}
