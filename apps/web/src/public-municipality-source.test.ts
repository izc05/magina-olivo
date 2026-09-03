import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('verified Sierra Mágina municipality seed keeps unique five-digit AEMET codes', async () => {
  const migration = await read('../../../db/migrations/0007_public_municipalities.sql');
  const codes = migration.match(/'23\d{3}'/g)?.map((value) => value.slice(1, -1)) ?? [];

  assert.equal(codes.length, 14);
  assert.equal(new Set(codes).size, 14);
  for (const code of codes) assert.match(code, /^\d{5}$/);

  assert.match(migration, /'cambil'.*'23018'.*\["Arbuniel"\]/s);
  assert.match(migration, /'huelma'.*'23044'.*\["Solera"\]/s);
  assert.match(migration, /'bedmar-y-garciez'.*'23902'.*\["Bedmar","Garcíez"\]/s);
  assert.match(migration, /'carcheles'.*'23901'.*\["Carchelejo","Cárchel"\]/s);
});

test('weather public route resolves a verified slug instead of trusting a user-supplied AEMET code', async () => {
  const route = await read('../../api/src/public-weather-routes.ts');

  assert.match(route, /required: \['municipality'\]/);
  assert.match(route, /from public_municipalities/);
  assert.match(route, /where slug = \$1 and active = true/);
  assert.match(route, /fetchAemetDailyForecast\(municipality\.aemet_code\)/);
  assert.doesNotMatch(route, /AEMET_ALLOWED_MUNICIPALITY_CODES/);
});
