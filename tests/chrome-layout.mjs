import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export async function measureChrome(fixture, profile, width) {
  const process = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await delay(100); }
    }
    assert.ok(port, 'Chrome debugging port is ready');
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (pending.has(message.id)) { const { resolve, reject, timer } = pending.get(message.id); clearTimeout(timer); pending.delete(message.id); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); } };
    const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const number = ++id; const timer = setTimeout(() => { pending.delete(number); reject(new Error(`${method} timed out`)); }, 15000); pending.set(number, { resolve, reject, timer }); socket.send(JSON.stringify({ id: number, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);
    await call('Page.navigate', { url: pathToFileURL(fixture).href }, sessionId);
    for (let attempt = 0; attempt < 100; attempt++) {
      const { result } = await call('Runtime.evaluate', { expression: 'document.getElementById("layout-output")?.textContent', returnByValue: true }, sessionId);
      if (result.value) return JSON.parse(result.value);
      await delay(100);
    }
    throw new Error('Chrome did not return layout measurements');
  } finally {
    socket?.close();
    process.kill();
    await new Promise(resolve => { if (process.exitCode !== null) resolve(); else process.once('exit', resolve); });
  }
}
