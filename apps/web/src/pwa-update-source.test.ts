import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

test('PWA update policy is wired to the service worker lifecycle', () => {
  assert.match(mainSource, /onNeedRefresh\(\)/);
  assert.match(mainSource, /applyPwaUpdateWhenSafe/);
  assert.match(mainSource, /listPendingOperations/);
  assert.match(mainSource, /magina:sync-complete/);
});
