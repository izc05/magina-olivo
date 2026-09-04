import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const shareSource = readFileSync(new URL('./PublicShare.tsx', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

test('public sharing stays local and privacy-safe until analytics consent is chosen', () => {
  assert.match(shareSource, /navigator\.share/);
  assert.match(shareSource, /https:\/\/wa\.me/);
  assert.match(shareSource, /navigator\.clipboard/);
  assert.match(shareSource, /magina:public-growth-event/);
  assert.match(shareSource, /share_started/);
  assert.doesNotMatch(shareSource, /\bfetch\s*\(/);
  assert.doesNotMatch(shareSource, /localStorage|sessionStorage|document\.cookie/);
});

test('share controls are mounted only on the six public Magina surfaces', () => {
  assert.match(mainSource, /import \{ PublicShare \} from '\.\/PublicShare'/);
  assert.equal((mainSource.match(/\{publicShare\}/g) ?? []).length, 6);

  for (const route of [
    '/magina',
    '/magina/directorio',
    '/magina/tiempo',
    '/magina/campo',
    '/magina/noticias',
    '/magina/mercado',
  ]) {
    assert.ok(mainSource.includes(`path === '${route}'`), `missing public route: ${route}`);
  }

  assert.ok(mainSource.indexOf("path === '/cuenta'") < mainSource.indexOf("path === '/magina'"));
  assert.ok(mainSource.indexOf("path === '/calendario'") < mainSource.indexOf("path === '/magina'"));
});
