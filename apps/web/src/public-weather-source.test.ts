import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('public weather UI selects human municipality slugs and attributes AEMET', async () => {
  const page = await read('./MaginaWeatherPage.tsx');

  assert.match(page, /\/api\/v1\/public\/municipalities/);
  assert.match(page, /\/api\/v1\/public\/weather\?municipality=/);
  assert.match(page, /AEMET/);
  assert.match(page, /incluye \$\{item\.aliases\.join/);
  assert.doesNotMatch(page, /municipalityCode/);
  assert.doesNotMatch(page, /AEMET_API_KEY/);
});

test('public weather UI includes animated precipitation radar controls without exposing server credentials', async () => {
  const page = await read('./MaginaWeatherPage.tsx');

  assert.match(page, /\/api\/v1\/public\/weather\/radar\/frames/);
  assert.match(page, /Radar de lluvia/);
  assert.match(page, /▶ Reproducir/);
  assert.match(page, /type="range"/);
  assert.match(page, /nubosidad por satélite/);
  assert.match(page, /setRadarPlaying/);
  assert.doesNotMatch(page, /AEMET_API_KEY/);
});

test('public weather route is exposed as a standalone Mágina page', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /path === '\/magina\/tiempo'/);
  assert.match(main, /<MaginaWeatherPage \/>/);
});
