import { readFile } from 'node:fs/promises';
const asUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
export async function loadPriceModules(registry) {
  const detailsSource = (await readFile(new URL('../lib/publicDetails.js', import.meta.url), 'utf8')).replace('import registry from "./publicDetails.json";', 'const registry = {};');
  const publicSource = (await readFile(new URL('../lib/publicPrices.js', import.meta.url), 'utf8'))
    .replace('import registry from "./publicPrices.json";', `const registry = ${JSON.stringify(registry ?? JSON.parse(await readFile(new URL('../lib/publicPrices.json', import.meta.url), 'utf8')))};`)
    .replace('"./publicDetails"', JSON.stringify(asUrl(detailsSource)));
  const publicUrl = asUrl(publicSource);
  const utilsSource = (await readFile(new URL('../lib/utils.js', import.meta.url), 'utf8')).replace('"./publicPrices"', JSON.stringify(publicUrl));
  const utilsUrl = asUrl(utilsSource);
  return { publicPrices: await import(publicUrl), utils: await import(utilsUrl), utilsUrl };
}
export async function loadUtilsSource() {
  const { utilsUrl } = await loadPriceModules();
  return Buffer.from(utilsUrl.split(',')[1], 'base64').toString();
}
