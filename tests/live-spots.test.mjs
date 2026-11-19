import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const liveSource = await readFile(new URL("../lib/live.js", import.meta.url), "utf8");

// Real live.getSpots and Supabase query builder; only the HTTP response is simulated.
function fixture(count, failAt = null) {
  const rows = Array.from({ length: count }, (_, i) => ({ id: `spot-${String(i).padStart(4, "0")}`, name: `Restaurant ${String(Math.floor(i / 3)).padStart(4, "0")}` }));
  const requests = [];
  const fetch = async (input) => {
    const url = new URL(input);
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Math.min(Number(url.searchParams.get("limit") || 1000), 1000);
    requests.push({ offset, limit, order: url.searchParams.get("order"), select: url.searchParams.get("select") });
    if (offset === failAt) return new Response(JSON.stringify({ message: "page unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(rows.slice(offset, offset + limit)), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const clientFactory = () => createClient("https://fixture.supabase.co", "fixture-public-key", { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const code = liveSource.replace('import { createClient } from "@supabase/supabase-js";', "").replace("export const live =", "const live =");
  const live = new Function("createClient", `${code}\nreturn live;`)(clientFactory);
  return { live, rows, requests };
}

test("live getSpots stops at empty pages and exact batch boundaries", async () => {
  for (const count of [0, 499, 500, 1000]) {
    const { live, rows, requests } = fixture(count);
    assert.deepEqual(await live.getSpots(), rows);
    assert.equal(requests.length, Math.floor(count / 500) + 1);
  }
});

test("live getSpots rejects a later-page failure rather than returning truncated success", async () => {
  const { live } = fixture(1015, 500);
  await assert.rejects(live.getSpots(), /page unavailable/);
});

test("live getSpots returns all 1015 records beyond the Supabase 1000-row cap", async () => {
  const { live, rows, requests } = fixture(1015);
  const result = await live.getSpots();
  assert.equal(result.length, 1015);
  assert.deepEqual(result, rows);
  assert.equal(new Set(result.map((s) => s.id)).size, 1015);
  assert.deepEqual(requests.map((r) => [r.offset, r.limit]), [[0, 500], [500, 500], [1000, 500]]);
  for (const request of requests) {
    assert.equal(request.order, "name.asc,id.asc");
    assert.equal(request.select, "*");
  }
});
