import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Observatorio market source is registered without claiming structured prices are current', async () => {
  const migration = await read('../../../db/migrations/0008_public_market_source.sql');

  assert.match(migration, /observatorio-agricultural-prices/);
  assert.match(migration, /CC BY 4\.0/);
  assert.match(migration, /SEMANAL\.csv/);
  assert.match(migration, /SEMANAL_0\.js/);
  assert.match(migration, /catalogLastUpdatedAt.*2020-06-25/);
  assert.match(migration, /catalogDeclaredFrequency.*daily/);
  assert.match(migration, /requires-staging-verification/);
  assert.match(migration, /market-context-not-member-settlement/);
  assert.match(migration, /Informe semanal de aceite\. Semana 35/);
  assert.match(migration, /latestEditorialOilPublicationDate.*2026-08-30/);
  assert.doesNotMatch(migration, /"price"\s*:/i);
});
