import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('pending private work is refreshed immediately and retried when connectivity returns', async () => {
  const source = await read('./ConnectivityStatus.tsx');

  assert.match(source, /refreshPending\(\)\.then/);
  assert.match(source, /summary\.total > 0/);
  assert.match(source, /void sync\(\)/);
  assert.match(source, /addEventListener\('online', handleOnline\)/);
  assert.match(source, /magina:delivery-offline-queued/);
  assert.match(source, /magina:activity-offline-queued/);
  assert.match(source, /magina:sync-complete/);
  assert.match(source, /aria-atomic="true"/);
});

test('mobile offline and navigation feedback respect small screens and safe areas', async () => {
  const connectivityCss = await read('./connectivity.css');
  const navigationCss = await read('./navigation-v2.css');
  const coldStartCss = await read('./offline-cold-start.css');

  assert.match(connectivityCss, /env\(safe-area-inset-bottom\)/);
  assert.match(connectivityCss, /bottom: calc\(/);
  assert.match(navigationCss, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(navigationCss, /@media \(max-width: 340px\)/);
  assert.match(coldStartCss, /min-height: 100dvh/);
  assert.match(coldStartCss, /env\(safe-area-inset-top\)/);
  assert.match(coldStartCss, /env\(safe-area-inset-bottom\)/);
});
