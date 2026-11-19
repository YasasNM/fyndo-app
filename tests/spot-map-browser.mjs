// Network-free Chrome fixture: actual SpotMap JSX, React effects, and installed Leaflet.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const repo = fileURLToPath(new URL('../', import.meta.url));
const output = 'C:/Users/yasas/AppData/Local/hermes/cache/scratch/fyndo-login-first/map-fix';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fixture(probe) {
  const modules = {};
  // Bundle the installed CommonJS browser runtime without adding a bundler dependency.
  async function include(id) {
    const filename = require.resolve(id);
    if (modules[filename]) return filename;
    const source = await readFile(filename, 'utf8');
    modules[filename] = { source, imports: {} };
    const local = createRequire(filename);
    for (const match of source.matchAll(/require\(["']([^"']+)["']\)/g)) {
      modules[filename].imports[match[1]] = await include(local.resolve(match[1]));
    }
    return filename;
  }
  const react = await include('react');
  const client = await include('react-dom/client');
  const jsx = await include('react/jsx-runtime');
  const { transform } = require('next/dist/build/swc');
  async function compile(relative) {
    return (await transform(await readFile(path.join(repo, relative), 'utf8'), {
      filename: relative, jsc: { parser: { syntax: 'ecmascript', jsx: true },
        transform: { react: { runtime: 'automatic' } }, target: 'es2020' },
      module: { type: 'commonjs' },
    })).code;
  }
  const component = await compile('components/SpotMap.js');
  const icons = await compile('components/Icon.js');
  const phosphor = await compile('components/phosphor.js');
  const tiles = await compile('lib/tiles.js');
  return `<!doctype html><html><head><link rel="stylesheet" href="/leaflet.css"><style>
    body{margin:0}#host{width:800px}.fy-pin{background:#0f3b2c;color:white}
  </style></head><body><div id="host"></div><script src="/leaflet.js"></script><script>
  window.__errors=[]; window.__trace=[]; window.__maps=[];
  addEventListener('error',e=>__errors.push(e.message));
  addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
  const nativeTimeout=window.setTimeout,nativeClearTimeout=window.clearTimeout;
  const pending50=new Set();
  window.clearTimeout=timer=>{pending50.delete(timer);nativeClearTimeout(timer);};
  window.setTimeout=function(fn,ms,...args){
    if(ms===50 && ${JSON.stringify(probe)}==='without-invalidation')return 0;
    let timer=nativeTimeout(()=>{pending50.delete(timer);fn(...args)},ms);
    if(ms===50)pending50.add(timer);return timer;
  };
  const proto=L.Map.prototype;
  for(const method of ['initialize','_animateZoom','_onZoomTransitionEnd','invalidateSize','remove']){
    const original=proto[method];
    proto[method]=function(...args){
      if(method==='initialize')__maps.push(this);
      __trace.push({method,alive:!!this._mapPane,animating:!!this._animatingZoom,time:performance.now()});
      return original.apply(this,args);
    };
  }
  if(${JSON.stringify(probe)}==='without-initial-animation'){
    const original=proto.setView;proto.setView=function(center,zoom,options){
      return original.call(this,center,zoom,zoom===16?{...options,animate:false}:options);
    };
  }
  const definitions=${JSON.stringify(modules)}, cache={};
  function load(id){if(cache[id])return cache[id].exports;
    const module=cache[id]={exports:{}};const definition=definitions[id];
    new Function('require','module','exports','process',definition.source)(
      name=>load(definition.imports[name]),module,module.exports,{env:{NODE_ENV:'development'}});
    return module.exports;
  }
  const React=load(${JSON.stringify(react)}),ReactDOM=load(${JSON.stringify(client)});
  function evaluate(source,imports){const module={exports:{}};
    new Function('require','module','exports',source)(name=>{
      if(!(name in imports))throw Error('Unexpected dependency '+name);return imports[name];
    },module,module.exports);return module.exports;
  }
  const Icon=evaluate(${JSON.stringify(icons)},{'react/jsx-runtime':load(${JSON.stringify(jsx)}),'./phosphor':evaluate(${JSON.stringify(phosphor)},{})});
  const Tiles=evaluate(${JSON.stringify(tiles)},{});
  const SpotMap=evaluate(${JSON.stringify(component)},{react:React,
    'react/jsx-runtime':load(${JSON.stringify(jsx)}),'leaflet/dist/leaflet.css':{},
    '@/components/Icon':Icon,'@/lib/tiles':Tiles,leaflet:{__esModule:true,default:L}}).default;
  let root;
  window.mount=(props,strict=false)=>{root=ReactDOM.createRoot(document.getElementById('host'));
    root.render(strict?React.createElement(React.StrictMode,null,React.createElement(SpotMap,props)):React.createElement(SpotMap,props));};
  window.update=props=>root.render(React.createElement(SpotMap,props));
  window.unmount=()=>{root.unmount();root=null;};
  window.snapshot=()=>{const m=__maps.at(-1);return {errors:__errors,trace:__trace,
    pending50:pending50.size,mapCount:__maps.length,alive:!!m?._mapPane,
    animating:!!m?._animatingZoom,zoom:m?.getZoom(),size:m?._mapPane?m.getSize():null,
    center:m?._mapPane?m.getCenter():null,bounds:m?._mapPane?m.getBounds():null,
    markers:document.querySelectorAll('.leaflet-marker-icon').length,
    popups:m?Object.values(m._layers).filter(l=>l instanceof L.Marker).map(l=>!!l.getPopup()):[],
    attribution:document.querySelector('.leaflet-control-attribution')?.textContent,
    wheel:m?.scrollWheelZoom.enabled()};};
  window.__ready=true;
  </script></body></html>`;
}

export async function runSpotMapQa({ probe = 'regression', label = probe } = {}) {
  await mkdir(output, { recursive: true });
  const html = await fixture(probe);
  await writeFile(path.join(output, `${label}-fixture.html`), html);
  const leafletJs = await readFile(require.resolve('leaflet/dist/leaflet-src.js'));
  const leafletCss = await readFile(require.resolve('leaflet/dist/leaflet.css'));
  const server = createServer((req, res) => {
    if (req.url === '/leaflet.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(leafletJs); }
    else if (req.url === '/leaflet.css') { res.setHeader('Content-Type', 'text/css'); res.end(leafletCss); }
    else if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = path.join(output, `chrome-${label}-${process.pid}`);
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let socket;
  const exceptions = [], blocked = [], checks = [];
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
      catch { await delay(50); }
    }
    assert.ok(port, 'Chrome started');
    socket = new WebSocket((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0, session;
    const pending = new Map();
    const call = (method, params = {}, sessionId = session) => new Promise((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => { pending.delete(n); reject(Error(`${method} timeout`)); }, 15000);
      pending.set(n, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    socket.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (pending.has(msg.id)) {
        const p = pending.get(msg.id); clearTimeout(p.timer); pending.delete(msg.id);
        msg.error ? p.reject(Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      }
      if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        if (request.url.startsWith(origin + '/')) call('Fetch.continueRequest', { requestId }).catch(() => {});
        else { blocked.push(new URL(request.url).hostname); call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {}); }
      }
    };
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' }, null);
    session = (await call('Target.attachToTarget', { targetId, flatten: true }, null)).sessionId;
    await call('Runtime.enable'); await call('Page.enable');
    await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await call('Page.navigate', { url: origin });
    async function evaluate(expression) {
      const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    }
    async function until(expression) {
      for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(10); }
      throw Error('Not reached: ' + expression + '; ' + JSON.stringify({ exceptions, state: await evaluate('({errors:window.__errors,text:document.body.innerText.slice(0,200)})') }));
    }
    await until('window.__ready');
    const one = { spots: [{ id: 'qa-one', name: 'Local pin', area: 'Colombo', category: 'Café', lat: 6.9, lng: 79.86 }], single: true };
    const many = { spots: [...one.spots, { id: 'qa-two', name: 'Second local pin', area: 'Colombo', category: 'Restaurant', lat: 6.905, lng: 79.865 }], me: { lat: 6.899, lng: 79.859 } };
    // Tear down in the exact interval between animation start and Leaflet's fallback timer.
    await evaluate(`mount(${JSON.stringify(one)})`);
    await until(probe === 'without-initial-animation' ? '__maps.at(-1)?.getZoom()===16' : '__maps.at(-1)?._animatingZoom');
    checks.push({ name: 'before-initial-navigation', ...(await evaluate('snapshot()')) });
    await evaluate('unmount()'); await delay(350);
    checks.push({ name: 'after-initial-navigation', ...(await evaluate('snapshot()')) });
    if (probe === 'regression') {
      // Public zoom-control interaction followed by real React unmount, including StrictMode replay.
      for (let i = 0; i < 12; i++) {
        await evaluate(`mount(${JSON.stringify(i % 2 ? many : one)},${i % 3 === 0})`);
        await until('__maps.at(-1)?._mapPane && document.querySelectorAll(".leaflet-marker-icon").length>0');
        await delay(320);
        await evaluate('document.querySelector(".leaflet-control-zoom-in").click()');
        await until('__maps.at(-1)?._animatingZoom');
        await evaluate('unmount()'); await delay(280);
      }
      checks.push({ name: '12-rapid-zoom-navigation-cycles', ...(await evaluate('snapshot()')) });
      await evaluate(`mount(${JSON.stringify(one)})`);
      await until('document.querySelectorAll(".leaflet-marker-icon").length===1'); await delay(350);
      await evaluate('document.querySelector(".leaflet-control-zoom-in").click();unmount()');
      await delay(350);
      checks.push({ name: 'navigation-before-queued-zoom-frame', ...(await evaluate('snapshot()')) });
      await evaluate(`mount(${JSON.stringify(many)})`);
      await until('document.querySelectorAll(".leaflet-marker-icon").length===2'); await delay(350);
      const bounds = await evaluate(`(()=>{const m=__maps.at(-1);return ${JSON.stringify([...many.spots, many.me])}.every(p=>m.getBounds().contains([p.lat,p.lng]));})()`);
      checks.push({ name: 'multiple-pins-and-location-bounds', containsAll: bounds, ...(await evaluate('snapshot()')) });
      await evaluate('document.querySelector(".leaflet-control-zoom-in").click()'); await delay(350);
      checks.push({ name: 'user-zoom-control', ...(await evaluate('snapshot()')) });
      await evaluate('document.getElementById("host").style.width="480px"; dispatchEvent(new Event("resize"))'); await delay(100);
      checks.push({ name: 'container-resize', ...(await evaluate('snapshot()')) });
      await evaluate(`update(${JSON.stringify(one)})`); await delay(350);
      checks.push({ name: 'list-to-single-update', ...(await evaluate('snapshot()')) });
      await evaluate('unmount()'); await delay(350);
      // Same-tick teardown before the import continuation, then immediate remount.
      await evaluate(`mount(${JSON.stringify(one)});unmount();mount(${JSON.stringify(many)},true)`);
      await until('document.querySelectorAll(".leaflet-marker-icon").length===2'); await delay(350);
      await evaluate('unmount()'); await delay(350);
      checks.push({ name: 'immediate-unmount-and-strict-remount', ...(await evaluate('snapshot()')) });
    }
    const evidence = { probe, leaflet: require('leaflet/package.json').version, react: require('react/package.json').version, origin, checks, exceptions, blocked: [...new Set(blocked)] };
    await writeFile(path.join(output, `${label}-evidence.json`), JSON.stringify(evidence, null, 2));
    return evidence;
  } finally {
    socket?.close(); chrome.kill();
    await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
    await new Promise(resolve => server.close(resolve));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const probe = process.argv[2] || 'regression';
  const result = await runSpotMapQa({ probe });
  console.log(JSON.stringify({ probe, checks: result.checks.map(c => ({ name: c.name, errors: c.errors, pending50: c.pending50 })), exceptions: result.exceptions }, null, 2));
}
