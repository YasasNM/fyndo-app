import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transform } = require('next/dist/build/swc');

export async function renderAuth({ user, pathname = '/', search = '', hash = '', file = 'app/layout.js', states = {}, data = {} } = {}) {
  const effects = [], redirects = [], handlers = [];
  let mounts = 0, navMounts = 0, index = 0;
  const window = { location: { pathname, search, hash, href: '' } };
  const runtime = require('react/jsx-runtime');
  const modules = {
    react: { ...React, useEffect: (fn) => effects.push(fn), useState: (initial) => [Object.hasOwn(states, index) ? states[index++] : (index++, initial), () => {}] },
    'react/jsx-runtime': Object.fromEntries(Object.entries(runtime).map(([key, value]) => [key, ['jsx', 'jsxs'].includes(key) ? (type, props, ...rest) => { if (props?.onClick) handlers.push({ children: props.children, click: props.onClick }); return value(type, props, ...rest); } : value])),
    'next/navigation': { usePathname: () => pathname, useRouter: () => ({ replace: (url) => redirects.push(url) }) },
    'next/link': { default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) },
    '@/lib/hooks': { useUser: () => user },
    '@/lib/data': { db: data, isLive: false },
    '@/lib/theme': { THEME_BOOT: '' },
    '@/components/Nav': { default: () => { navMounts++; return React.createElement('nav', {}, 'FEATURE NAV'); } },
    '@/components/PWA': { default: () => null },
    '@/components/Icon': { Ico: () => null },
    '@/components/AuthArt': { default: () => null },
    '@/components/Captcha': { default: () => null, CAPTCHA_KEY: '' },
  };
  async function load(name) {
    if (modules[name]) return modules[name];
    if (name.endsWith('.css')) return {};
    const path = name.startsWith('@/') ? name.slice(2) + '.js' : name;
    const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
    const compiled = await transform(source, { filename: path, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2020' }, module: { type: 'commonjs' } });
    for (const match of compiled.code.matchAll(/require\("([^"]+)"\)/g)) await load(match[1]);
    const module = { exports: {} };
    new Function('require', 'module', 'exports', 'window', compiled.code)((id) => ({ __esModule: true, ...modules[id] }), module, module.exports, window);
    return modules[name] = module.exports;
  }
  const component = (await load(file)).default;
  const Private = () => { mounts++; return React.createElement('div', {}, 'PRIVATE PAGE'); };
  const html = renderToStaticMarkup(React.createElement(component, { children: React.createElement(Private) }));
  for (const effect of effects) effect();
  return { html, mounts, navMounts, redirects, handlers, window };
}
