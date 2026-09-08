import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('visual registry covers the fifteen D.O. Sierra Mágina municipalities', async () => {
  const registry = await read('./municipality-visuals.ts');
  const entries = registry.match(/\bvisual\('/g) ?? [];

  assert.equal(entries.length, 15);
  assert.match(registry, /visual\('larva', 'Larva'\)/);
  assert.match(registry, /MUNICIPALITY_PREFERENCE_KEY = 'magina-olivo-public-municipality'/);
  assert.match(registry, /DEFAULT_TERRITORY_HERO = '\/photos\/home-sierra-magina\.webp'/);
  assert.match(registry, /if \(!item\.ready\)/);
});

test('public home uses one municipality context for selector, weather and hero', async () => {
  const home = await read('./PublicHomePage.tsx');

  assert.match(home, /value=\{selectedMunicipality\}/);
  assert.match(home, /setSelectedMunicipality\(slug\)/);
  assert.match(home, /writePreferredMunicipality\(slug\)/);
  assert.match(home, /writePreferredMunicipality\(holdingMunicipality\)/);
  assert.match(home, /weather\?municipality=\$\{encodeURIComponent\(selectedMunicipality\)\}/);
  assert.match(home, /municipalityHeroSources\(selectedVisual\)/);
  assert.match(home, /resolveMunicipalitySlug\(nextHolding\?\.municipality\)/);
  assert.match(home, /<PhotoCredit photo=\{selectedVisual\} municipality=\{selectedVisual\.name\} \/>/);
  assert.doesNotMatch(home, /weather\?municipality=bedmar-y-garciez/);
});

test('weather detail inherits and updates the same municipality preference', async () => {
  const weather = await read('./MaginaWeatherPage.tsx');

  assert.match(weather, /readPreferredMunicipality\(\) \?\? DEFAULT_MUNICIPALITY_SLUG/);
  assert.match(weather, /writePreferredMunicipality\(slug\)/);
  assert.match(weather, /onChange=\{\(event\) => selectMunicipality\(event\.target\.value\)\}/);
  assert.doesNotMatch(weather, /useState\('huelma'\)/);
});

test('municipality photo credits switch only when an approved image is ready', async () => {
  const chrome = await read('./VisualChrome.tsx');
  const registry = await read('./municipality-visuals.ts');

  assert.match(chrome, /photo\?\.ready && photo\.photoAuthor && photo\.photoSource && photo\.photoLicense && photo\.photoLicenseUrl/);
  assert.match(chrome, /Adaptación y recorte WebP para Mágina Olivo/);
  assert.match(registry, /reviewStatus: 'crop_review'/);
  assert.match(registry, /photoLicenseUrl:/);
});

test('municipality assets are gated behind reviewed readiness', async () => {
  const registry = await read('./municipality-visuals.ts');
  const readme = await read('../public/municipalities/README.md');

  assert.match(registry, /ready: false/);
  assert.match(readme, /No copiar imágenes de Google/);
  assert.match(readme, /autor, fuente y licencia\/autorización/);
});
