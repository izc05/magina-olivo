import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const submitScript = fileURLToPath(new URL('../scripts/submit-indexnow.mjs', import.meta.url));

function runSubmit(args: string[] = [], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [submitScript, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      INDEXNOW_KEY: 'Magina-Key-2026',
      INDEXNOW_DRY_RUN: '1',
      PUBLIC_SITE_URL: 'https://example.com/app',
      ...env,
    },
  });
}

test('IndexNow dry-run emits only approved canonical public URLs', () => {
  const result = runSubmit(['/magina/mercado', '/magina/tiempo']);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout.trim()) as { urlList: string[]; keyLocation: string };
  assert.deepEqual(payload.urlList, [
    'https://example.com/app/magina/mercado',
    'https://example.com/app/magina/tiempo',
  ]);
  assert.equal(payload.keyLocation, 'https://example.com/app/Magina-Key-2026.txt');
});

test('IndexNow rejects private routes and SEO aliases', () => {
  for (const path of ['/cuenta', '/register', '/precio-aove-jaen', '/alertas-olivar-jaen']) {
    const result = runSubmit([path]);
    assert.notEqual(result.status, 0, `expected rejection for ${path}`);
    assert.match(result.stderr, /not an approved canonical public route/);
  }
});

test('IndexNow rejects same-host URLs that are not canonical public URLs', () => {
  const result = runSubmit(['https://example.com/app/cuenta']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not an approved canonical public URL/);
});

test('IndexNow rejects keys that do not follow the protocol character set', () => {
  const result = runSubmit(['/magina'], { INDEXNOW_KEY: 'bad_key_2026' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /letters, numbers or hyphen/);
});

test('IndexNow key location must cover every submitted URL path', () => {
  const result = runSubmit(['/magina/mercado'], {
    INDEXNOW_KEY_LOCATION: 'https://example.com/app/narrow/Magina-Key-2026.txt',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not cover/);
});
