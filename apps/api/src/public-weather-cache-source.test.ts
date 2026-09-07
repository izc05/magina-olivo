import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('public daily weather keeps a bounded persistent AEMET cache across releases', async () => {
  const routes = await read('./public-weather-routes.ts');
  const migration = await read('../../../db/migrations/0046_public_weather_forecast_cache.sql');

  assert.match(routes, /readPersistedForecast/);
  assert.match(routes, /writePersistedForecast/);
  assert.match(routes, /public_weather_forecast_cache/);
  assert.match(routes, /canServeWeatherFallback/);
  assert.match(migration, /public_weather_forecast_cache/);
  assert.match(migration, /public municipal forecasts/);
});
