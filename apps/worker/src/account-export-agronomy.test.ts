import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('structured account export includes user-declared plot olive variety', async () => {
  const augment = await read('./account-export-tasks.ts');
  const migration = await read('../../../db/migrations/0018_plot_agronomy_profile.sql');

  assert.match(augment, /select p\.id, p\.olive_variety/);
  assert.match(augment, /oliveVariety: varietyByPlotId\.get\(id\) \?\? null/);
  assert.match(augment, /hasPlotVarietyExport/);
  assert.match(augment, /Object\.prototype\.hasOwnProperty\.call\(plot, 'oliveVariety'\)/);
  assert.match(augment, /Buffer\.byteLength\(artifact, 'utf8'\)/);
  assert.match(augment, /createHash\('sha256'\)/);
  assert.match(migration, /olive_variety text/);
});
