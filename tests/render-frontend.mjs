// Exercise the real JSX with only browser/data and unrelated child components stubbed.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const gmapsSource = await readFile(new URL('../lib/gmaps.js', import.meta.url), 'utf8');
const gmaps = await import(`data:text/javascript;base64,${Buffer.from(gmapsSource).toString('base64')}`);
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { transform } = require("next/dist/build/swc");

export async function renderFrontend(file, { utils, spots = [], state = {}, spot, props = {}, query = {}, user = null } = {}) {
  let stateIndex = 0;
  const mockedReact = { ...React, useEffect() {}, useState(initial) {
    const index = stateIndex++;
    return [Object.hasOwn(state, index) ? state[index] : initial === undefined && spot ? spot : typeof initial === "function" ? initial() : initial, () => {}];
  } };
  const empty = () => null;
  const link = ({ children, href, ...rest }) => React.createElement("a", { href, ...rest }, children);
  const stubCard = ({ spot: s }) => React.createElement("article", { "data-spot": s.id }, s.name);
  const seeds = { AREAS: ["Colombo 3", "Colombo 4", "Colombo 5", "Colombo 7", "Dehiwala", "Mount Lavinia"], MOODS: [], CATEGORIES: ["Restaurant", "Café", "Activity"] };
  const modules = {
    react: mockedReact,
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next/link": { default: link },
    "next/dynamic": { default: () => empty },
    "next/navigation": { useSearchParams: () => new URLSearchParams(query) },
    "@/lib/utils": utils,
    "@/lib/seed": seeds,
    "@/lib/hooks": { useSpots: () => ({ spots }), useRatings: () => ({}), usePopular: () => [], useCollections: () => [], useUser: () => user, useLocation: () => ({ pos: null }), useSaves: () => ({ ids: [], toggle() {} }) },
    "@/lib/planner": { VIBES: [] },
    "@/lib/sun": { useSunsets: () => ({}) },
    "@/lib/weather": { useWeather: () => null },
    "@/lib/features": { FEATURES: [], OCCASIONS: [], featureOf: () => null },
    "@/components/SpotCard": { default: stubCard, SkeletonGrid: empty, Thumb: empty, priceParts: () => ({ big: "", unit: "Prices not added yet" }), nowHHMM: () => "12:00" },
    "@/components/Icon": { Ico: empty, CAT_ICON: {}, ICON_MARKUP: {} },
    "@/components/Stars": { RatingPill: empty },
    "@/lib/api": { googleDown: () => true },
    "@/lib/coverPhotos": { coverFor: () => null },
    "@/lib/photoInfo": { photoMeta: () => ({ external: false, short: "" }), galleryPhotos: () => [] },
    "@/lib/config": { CONFIG: { whatsapp: "" } },
    "@/lib/gmaps": gmaps,
  };
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const compiled = await transform(source, { filename: file, jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2020" }, module: { type: "commonjs" } });
  const module = { exports: {} };
  const load = (id) => {
    const value = modules[id] || (id.startsWith("@/components/") ? { default: empty, DealBanner: empty, FeedbackBox: empty, FeaturePicker: empty, LinksFields: empty, PhotoSuggest: empty } : {});
    return { __esModule: true, ...value };
  };
  const FixedDate = class extends Date { constructor(...args) { super(...(args.length ? args : [2026, 0, 1, 12, 0])); } };
  new Function("require", "module", "exports", "Date", compiled.code)(load, module, module.exports, FixedDate);
  return renderToStaticMarkup(React.createElement(module.exports.default, props));
}
