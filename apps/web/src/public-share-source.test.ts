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
  assert.match(shareSource, /share_completed/);
  assert.doesNotMatch(shareSource, /\bfetch\s*\(/);
  assert.doesNotMatch(shareSource, /localStorage|sessionStorage|document\.cookie/);
});

test('shared links always come from approved canonical public routes', () => {
  assert.match(shareSource, /link\[rel=\"canonical\"\]/);
  assert.match(shareSource, /PUBLIC_SHARE_ROUTES/);
  assert.match(shareSource, /Public sharing is only available on approved public routes/);
  assert.match(shareSource, /Canonical URL does not match the current approved public route/);
  assert.match(shareSource, /url\.search = ''/);
  assert.match(shareSource, /url\.hash = ''/);

  for (const route of [
    '/magina',
    '/magina/directorio',
    '/magina/tiempo',
    '/magina/campo',
    '/magina/noticias',
    '/magina/mercado',
  ]) {
    assert.ok(shareSource.includes(`'${route}'`), `missing approved share route: ${route}`);
  }

  for (const privateRoute of ['/cuenta', '/calendario', '/onboarding', '/register', '/reset-password']) {
    assert.ok(!shareSource.includes(`'${privateRoute}'`), `private route must never be share-approved: ${privateRoute}`);
  }
});

test('public shares carry channel-specific UTM attribution without personal identifiers', () => {
  for (const expected of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'magina_public_growth',
    'web_share',
    'whatsapp',
    'copy_link',
  ]) {
    assert.ok(shareSource.includes(expected), `missing public share attribution: ${expected}`);
  }

  assert.match(shareSource, /utm_medium', 'share'/);
  assert.doesNotMatch(shareSource, /userId|user_id|email|plotId|plot_id|campaignId|campaign_id/);
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
