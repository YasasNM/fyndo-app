// Runs the built site + server functions together, like Azure Static Web Apps does.
// Usage:  npm run build   then   npm run local   (open http://localhost:4280)
// Put your keys in api/local.settings.json (see api/local.settings.example.json) to test Google and AI.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve("out");
const API = path.resolve("api");
const PORT = Number(process.env.PORT || 4280);

try {
  const s = JSON.parse(fs.readFileSync(path.join(API, "local.settings.json"), "utf8"));
  Object.assign(process.env, s.Values || {});
} catch {}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };

async function runApi(name, req, res, url, body) {
  const file = path.join(API, name, "index.js");
  if (!/^[a-z-]+$/.test(name) || !fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
  const handler = require(file);
  let parsed = body;
  try { if ((req.headers["content-type"] || "").includes("json")) parsed = JSON.parse(body || "{}"); } catch {}
  const context = { log: Object.assign((...a) => console.log(...a), { error: console.error }), res: null };
  await handler(context, { method: req.method, query: Object.fromEntries(url.searchParams), headers: req.headers, body: parsed });
  const r = context.res || { status: 204 };
  res.writeHead(r.status || 200, r.headers || {});
  res.end(r.body || "");
}

function serveFile(res, url) {
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" + url.search }); return res.end(); }
    file = path.join(file, "index.html");
  }
  if (!fs.existsSync(file)) { res.writeHead(404, { "Content-Type": TYPES[".html"] }); return res.end(fs.readFileSync(path.join(ROOT, "404.html"))); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const m = url.pathname.match(/^\/api\/([^/]+)\/?$/);
    if (m) return runApi(m[1], req, res, url, body).catch((e) => { console.error(e); res.writeHead(500); res.end("API error"); });
    serveFile(res, url);
  });
}).listen(PORT, () => console.log(`Fyndo running at http://localhost:${PORT}`));
