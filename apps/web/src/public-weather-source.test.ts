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

test('staging worker receives server-side AEMET radar configuration', async () => {
  const compose = (await read('../../../infra/docker/compose.staging.yml')).replace(/\r\n/g, '\n');
  const envExample = (await read('../../../infra/docker/staging.env.example')).replace(/\r\n/g, '\n');
  const workerBlock = compose.match(/\n  worker:\n([\s\S]*?)\n  web:\n/)?.[1] ?? '';

  assert.match(workerBlock, /AEMET_API_KEY: \$\{AEMET_API_KEY:\?set AEMET_API_KEY\}/);
  assert.match(workerBlock, /WEATHER_RADAR_CAPTURE_MINUTES: \$\{WEATHER_RADAR_CAPTURE_MINUTES:-10\}/);
  assert.match(envExample, /^WEATHER_RADAR_CAPTURE_MINUTES=10$/m);
});

test('public weather route is exposed as a standalone Mágina page', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /path === '\/magina\/tiempo'/);
  assert.match(main, /<WeatherWeeklyPage \/>/);
  assert.match(main, /path === '\/magina\/tiempo\/horas'/);
  assert.match(main, /<WeatherHourlyPage \/>/);
  assert.match(main, /path === '\/magina\/tiempo\/radar'/);
  assert.match(main, /<MaginaWeatherPage \/>/);
});

test('hourly weather remains server-connected and does not expose AEMET credentials', async () => {
  const page = await read('./WeatherExperiencePages.tsx');
  const routes = await read('../../api/src/public-weather-routes.ts');

  assert.match(page, /\/api\/v1\/public\/weather\/hourly\?municipality=/);
  assert.match(routes, /\/api\/v1\/public\/weather\/hourly/);
  assert.match(routes, /fetchAemetHourlyForecast/);
  assert.doesNotMatch(page, /AEMET_API_KEY/);
});

test('weekly forecast accepts AEMET ISO dates with an existing time and never throws on an invalid provider date', async () => {
  const page = await read('./WeatherExperiencePages.tsx');

  assert.match(page, /const value = new Date\(date\)/);
  assert.match(page, /Number\.isNaN\(value\.getTime\(\)\)/);
  assert.doesNotMatch(page, /new Date\(`\$\{date\}T12:00:00`\)/);
});
