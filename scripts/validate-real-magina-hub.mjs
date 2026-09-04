import { readFile } from 'node:fs/promises';

const pagePath = new URL('../src/features/news/RealNewsPage.tsx', import.meta.url);
const source = await readFile(pagePath, 'utf8');

if (/from ['"]\.\/NewsPage['"]/.test(source) || /<NewsPage\b/.test(source)) {
  throw new Error('RealNewsPage vuelve a depender del NewsPage heredado.');
}

for (const component of ['AlertsPanel', 'CooperativesPanel', 'DiscoverPanel', 'MarketPanel', 'MorePanel']) {
  if (!source.includes(component)) throw new Error(`Falta ${component} en el hub real de Mágina.`);
}

for (const mode of ['actualidad', 'cooperativas', 'mercado', 'discover', 'local', 'community', 'agenda', 'alertas']) {
  if (!source.includes(`'${mode}'`)) throw new Error(`El hub real no contempla el modo ${mode}.`);
}

console.log('Hub Mágina válido: sin fallback NewsPage y con los 8 modos cubiertos por navegación real.');
