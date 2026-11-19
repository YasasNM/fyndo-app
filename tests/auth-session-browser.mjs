import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureChrome } from './chrome-layout.mjs';
const require = createRequire(import.meta.url);
const { transform } = require('next/dist/build/swc');
const webpackModule = require('next/dist/compiled/webpack/webpack');
webpackModule.init();
const repo = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve('C:/Users/yasas/AppData/Local/hermes/cache/scratch', 'fyndo-login-first/session-race-fix');

// Compile production useUser and AuthGate unchanged; replace only adapter,
// navigation and unrelated Nav at the module boundary. React owns all hooks.
export async function runSessionScenario(name, scenario) {
  const dir = join(scratch, name);
  await mkdir(dir, { recursive: true });
  for (const [source, target] of [['lib/hooks.js', 'hooks.cjs'], ['components/AuthGate.js', 'gate.cjs'], ['lib/authRouting.js', 'routing.cjs']]) {
    const compiled = await transform(await readFile(join(repo, source), 'utf8'), { filename: source, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2020' }, module: { type: 'commonjs' } });
    await writeFile(join(dir, target), compiled.code);
  }
  await writeFile(join(dir, 'data.cjs'), `exports.db = { getUser: () => window.sessionHarness.lookup(), onAuthChange: cb => window.sessionHarness.subscribe(cb) };`);
  await writeFile(join(dir, 'navigation.cjs'), `exports.usePathname = () => '/admin'; const router = { replace: url => window.sessionHarness.redirects.push(url) }; exports.useRouter = () => router;`);
  await writeFile(join(dir, 'nav.cjs'), `const React = require('react'); exports.__esModule = true; exports.default = function Nav() { React.useEffect(() => { window.sessionHarness.nav++; return () => window.sessionHarness.nav--; }, []); return React.createElement('nav', null, 'FEATURE NAV'); };`);
  await writeFile(join(dir, 'entry.cjs'), `
const React = require('react');
const { createRoot } = require('react-dom/client');
const { flushSync } = require('react-dom');
const AuthGate = require('./gate.cjs').default;
const { useUser } = require('./hooks.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const h = window.sessionHarness = {
  requests: [], listeners: new Set(), redirects: [], nav: 0, private: 0, updates: [],
  lookup() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); this.requests.push({ resolve, reject }); return promise; },
  subscribe(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); },
  emit() { React.act(() => flushSync(() => { for (const cb of this.listeners) cb(); })); },
  assert(value, message) { if (!value) throw new Error(message); },
  locked() { return !document.body.textContent.includes('PRIVATE PAGE') && this.private === 0 && this.nav === 0; },
  async settle(index, value, fail = false) { await React.act(async () => { this.requests[index][fail ? 'reject' : 'resolve'](value); }); },
  async mount(mode = 'gate', strict = false) { this.root = createRoot(document.getElementById('root')); await React.act(async () => { const tree = React.createElement(mode === 'gate' ? AuthGate : Probe, null, React.createElement(Private)); this.root.render(strict ? React.createElement(React.StrictMode, null, tree) : tree); }); },
  async unmount() { await React.act(async () => this.root.unmount()); },
};
function Private() { React.useEffect(() => { h.private++; return () => h.private--; }, []); return React.createElement('div', null, 'PRIVATE PAGE'); }
function Probe() { const user = useUser(); h.updates.push(user); return React.createElement('div', null, user === undefined ? 'loading' : user === null ? 'signed out' : user.role); }
(async () => {
  let result;
  try { await (${scenario.toString()})(h); result = { ok: true, requests: h.requests.length }; }
  catch (error) { result = { ok: false, error: error.stack, requests: h.requests.length }; }
  finally { if (h.root) await h.unmount(); }
  const output = document.createElement('pre'); output.id = 'layout-output'; output.textContent = JSON.stringify(result); document.body.append(output);
})();
`);
  await new Promise((resolveBuild, reject) => {
    webpackModule.webpack({ mode: 'development', devtool: false, context: dir, entry: './entry.cjs', output: { path: dir, filename: 'bundle.js' }, resolve: { modules: [join(repo, 'node_modules')], alias: { './data': join(dir, 'data.cjs'), '@/lib/hooks': join(dir, 'hooks.cjs'), '@/lib/authRouting': join(dir, 'routing.cjs'), '@/components/Nav': join(dir, 'nav.cjs'), 'next/navigation': join(dir, 'navigation.cjs') } } }, (error, stats) => {
      if (error || stats.hasErrors()) reject(error || new Error(stats.toString({ all: false, errors: true }))); else resolveBuild();
    });
  });
  const fixture = join(dir, 'fixture.html');
  await writeFile(fixture, '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; connect-src \'none\'"><div id="root"></div><script src="bundle.js"></script>');
  await rm(join(dir, 'chrome-profile', 'DevToolsActivePort'), { force: true });
  const result = await measureChrome(fixture, join(dir, 'chrome-profile'), 800);
  await writeFile(join(dir, 'result.json'), JSON.stringify(result, null, 2));
  return result;
}
