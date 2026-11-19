import test from "node:test";
import assert from "node:assert/strict";
import { loadUtilsSource } from './load-utils.mjs';
import { readFile } from "node:fs/promises";

const source = await loadUtilsSource();
const utilsUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const utils = await import(utilsUrl);
const plannerSource = (await readFile(new URL("../lib/planner.js", import.meta.url), "utf8")).replace('"./utils"', JSON.stringify(utilsUrl));
const planner = await import(`data:text/javascript;base64,${Buffer.from(plannerSource).toString("base64")}`);
const { renderFrontend } = await import("./render-frontend.mjs");
const unknownSpot = { id: "osm-node-123", name: "Imported restaurant", area: "Nugegoda", category: "Restaurant", moods: [], menu: [], price_min: 0, price_max: 0, open_time: null, close_time: null };

test("card labels unknown hours without claiming open or closed", async () => {
  const html = await renderFrontend("components/SpotCard.js", { utils, props: { spot: unknownSpot } });
  assert.match(html, /Hours not added yet/);
  assert.doesNotMatch(html, /Open till|Closed now|, closed,/);
});

const known = { open_time: "09:00", close_time: "22:00" };

test("compare lowest-price badge only uses known prices", async () => {
  const paid = { ...unknownSpot, ...known, id: "paid", price_min: 3000, price_max: 3000 };
  const html = await renderFrontend("app/compare/page.js", { utils, spots: [unknownSpot, paid], query: { ids: `${unknownSpot.id},paid` } });
  assert.equal(html.includes("Prices not added yet (lowest)"), false);
  assert.match(html, /LKR 3,000 pp \(lowest\)/);
});

test("Home open-now filter excludes unknown and known closed hours", async () => {
  const open = { ...unknownSpot, ...known, id: "open" };
  const closed = { ...open, id: "closed", open_time: "18:00" };
  const html = await renderFrontend("app/page.js", { utils, spots: [unknownSpot, closed, open], state: { 8: true } });
  assert.deepEqual([...html.matchAll(/data-spot="([^"]+)"/g)].map((m) => m[1]), ["open"]);
});

test("planner excludes unknown hours in plans and AI shortlists while retaining estimated paid budgets", () => {
  const coffee = { ...unknownSpot, ...known, id: "coffee", category: "Café" };
  const dinner = { ...unknownSpot, ...known, id: "dinner" };
  const opts = { vibe: "chill", budget: 10000, start: "17:30" };
  const plan = planner.buildPlan([unknownSpot, coffee, dinner], opts);
  assert.deepEqual(plan.stops.map((s) => s.spot?.id), ["coffee", "dinner"]);
  assert.ok(plan.total > 0);
  const lists = planner.shortlists([unknownSpot, coffee, dinner], opts, plan);
  assert.ok(lists.every((l) => l.candidates.every((s) => s.id !== unknownSpot.id)));
  assert.ok(planner.buildPlan([unknownSpot], opts).stops.every((s) => s.spot === null));
});

test("OSM spot page visibly links source and ODbL attribution only for imported IDs", async () => {
  const html = await renderFrontend("app/spot/page.js", { utils, spot: unknownSpot });
  assert.ok(html.includes('href="https://www.openstreetmap.org/copyright"'), "Missing linked OpenStreetMap attribution");
  assert.match(html, /OpenStreetMap contributors/);
  assert.ok(html.includes('href="https://opendatacommons.org/licenses/odbl/1-0/"'), "Missing linked ODbL license");
  assert.match(html, /ODbL/);
  const localHtml = await renderFrontend("app/spot/page.js", { utils, spot: { ...unknownSpot, id: "local" } });
  assert.doesNotMatch(localHtml, /OpenStreetMap contributors/);
});

test("Admin area selector preserves imported area and other loaded areas", async () => {
  const edited = { ...unknownSpot, open_time: "", close_time: "", verified: false, hidden_gem: false, booking_enabled: false };
  const html = await renderFrontend("app/admin/page.js", { utils, user: { role: "admin" }, state: { 0: [edited, { ...edited, area: "Homagama" }], 1: edited } });
  const options = [...html.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.ok(options.includes("Nugegoda"), JSON.stringify(options));
  assert.ok(options.includes("Homagama"));
  assert.ok(options.includes("Colombo 3"));
});

test("Plan area selector includes actual imported areas", async () => {
  const html = await renderFrontend("app/plan/page.js", { utils, spots: [unknownSpot], state: { 0: 2 } });
  const options = [...html.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.ok(options.includes("Nugegoda"), JSON.stringify(options));
  assert.ok(options.includes("Colombo 3"));
});

test("Home area selector includes imported area once alongside defaults", async () => {
  const html = await renderFrontend("app/page.js", { utils, spots: [unknownSpot, unknownSpot], state: { 4: true } });
  const options = [...html.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.equal(options.filter((a) => a === "Nugegoda").length, 1);
  assert.ok(options.includes("Colombo 3"));
});

test("area options union defaults with actual spot areas without blanks or duplicates", () => {
  assert.equal(typeof utils.areaOptions, "function");
  assert.deepEqual(utils.areaOptions(["Colombo 3", "Dehiwala"], [unknownSpot, unknownSpot, { area: "" }, { area: null }, { area: "Dehiwala" }]), ["Colombo 3", "Dehiwala", "Nugegoda"]);
  assert.deepEqual(utils.areaOptions(["Colombo 3"], null), ["Colombo 3"]);
});

test("Home opening-soon row excludes unknown hours but All spots retains them", async () => {
  const closed = { ...unknownSpot, id: "later", name: "Later", open_time: "18:00", close_time: "22:00" };
  const html = await renderFrontend("app/page.js", { utils, spots: [unknownSpot, closed] });
  const row = html.match(/<section class="opennear"[\s\S]*?<\/section>/)?.[0] || "";
  assert.deepEqual([...row.matchAll(/data-spot="([^"]+)"/g)].map((m) => m[1]), ["later"]);
  assert.match(html, /data-spot="osm-node-123"/);
});

test("Home price sorts put unknown prices last in both directions", async () => {
  const low = { ...unknownSpot, ...known, id: "low", price_min: 500, price_max: 500 };
  const high = { ...low, id: "high", price_min: 4000, price_max: 4000 };
  for (const [sort, expected] of [["cheap", ["low", "high", unknownSpot.id]], ["pricey", ["high", "low", unknownSpot.id]]]) {
    const html = await renderFrontend("app/page.js", { utils, spots: [unknownSpot, low, high], state: { 11: sort } });
    assert.deepEqual([...html.matchAll(/data-spot="([^"]+)"/g)].map((m) => m[1]), expected);
  }
});

test("Home strict budget filter excludes estimated prices but keeps known free activities", async () => {
  const paid = { ...unknownSpot, ...known, id: "paid", name: "Priced spot", price_min: 800, price_max: 800 };
  const free = { ...paid, id: "free", name: "Free walk", category: "Activity", price_min: 0, price_max: 0 };
  const html = await renderFrontend("app/page.js", { utils, spots: [unknownSpot, paid, free], state: { 7: "2500" } });
  assert.doesNotMatch(html, /data-spot="osm-node-123"/);
  assert.match(html, /data-spot="paid"/);
  assert.match(html, /data-spot="free"/);
});

test("compare labels unknown hours instead of closed or midnight", async () => {
  const other = { ...unknownSpot, ...known, id: "known", name: "Known restaurant", price_min: 3000, price_max: 3000 };
  const html = await renderFrontend("app/compare/page.js", { utils, spots: [unknownSpot, other], query: { ids: `${unknownSpot.id},known` } });
  assert.match(html, /Hours not added yet/);
  assert.doesNotMatch(html, /12:00 AM|closed-now/);
  assert.match(html, /9:00 AM to 10:00 PM/);
});

test("spot page labels unknown hours without invented midnight hours", async () => {
  const html = await renderFrontend("app/spot/page.js", { utils, spot: unknownSpot });
  assert.match(html, /Hours not added yet/);
  assert.doesNotMatch(html, /12:00 AM|closed now|open now|pcard-state closed/);
});

test("invalid hours or query time are unknown", () => {
  for (const invalid of ["bad", "24:01", "25:00", "12:60", "09", "09:00junk", "-1:00", "09:00:60", 900]) {
    assert.equal(utils.isOpenAt({ ...known, open_time: invalid }, "12:00"), null, String(invalid));
    assert.equal(utils.isOpenAt({ ...known, close_time: invalid }, "12:00"), null, String(invalid));
    assert.equal(utils.isOpenAt(known, invalid), null, String(invalid));
  }
});

test("known daytime hours retain inclusive opening and exclusive closing", () => {
  assert.equal(utils.isOpenAt(known, "08:59"), false);
  assert.equal(utils.isOpenAt(known, "09:00"), true);
  assert.equal(utils.isOpenAt(known, "21:59"), true);
  assert.equal(utils.isOpenAt(known, "22:00"), false);
  assert.equal(utils.isOpenAt({ open_time: "09:00:00", close_time: "22:00:00" }, "12:00"), true);
});

test("known overnight hours still span midnight", () => {
  const night = { open_time: "18:00", close_time: "02:00" };
  for (const t of ["18:00", "23:59", "00:00", "01:59"]) assert.equal(utils.isOpenAt(night, t), true);
  for (const t of ["02:00", "12:00", "17:59"]) assert.equal(utils.isOpenAt(night, t), false);
});

test("equal valid hours still mean 24-hour opening", () => {
  for (const t of ["00:00", "12:00", "23:59"]) {
    assert.equal(utils.isOpenAt({ open_time: "00:00", close_time: "00:00" }, t), true);
    assert.equal(utils.isOpenAt({ open_time: "09:00", close_time: "09:00" }, t), true);
    assert.equal(utils.isOpenAt({ open_time: "00:00", close_time: "24:00" }, t), true);
  }
});

test("empty hours are unknown", () => {
  for (const empty of ["", " ", undefined]) {
    assert.equal(utils.isOpenAt({ ...known, open_time: empty }, "12:00"), null);
    assert.equal(utils.isOpenAt({ ...known, close_time: empty }, "12:00"), null);
  }
});

test("null hours are unknown rather than open all day", () => {
  assert.equal(utils.isOpenAt({ open_time: null, close_time: null }, "12:00"), null);
  assert.equal(utils.isOpenAt({ ...known, open_time: null }, "12:00"), null);
  assert.equal(utils.isOpenAt({ ...known, close_time: null }, "12:00"), null);
});
