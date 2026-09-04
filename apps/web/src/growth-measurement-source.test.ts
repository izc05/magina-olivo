import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const measurementSource = readFileSync(new URL('./growth-measurement.ts', import.meta.url), 'utf8');
const consentSource = readFileSync(new URL('./GrowthMeasurement.tsx', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

test('growth measurement is explicit opt-in and same-origin only', () => {
  assert.match(measurementSource, /VITE_PUBLIC_GROWTH_MEASUREMENT === 'enabled'/);
  assert.match(measurementSource, /readGrowthConsent\(\) !== 'granted'/);
  assert.match(measurementSource, /endpoint\.origin !== window\.location\.origin/);
  assert.match(measurementSource, /endpoint\.pathname !== '\/api\/public\/growth\/events'/);
  assert.match(measurementSource, /credentials: 'omit'/);
  assert.doesNotMatch(measurementSource, /document\.cookie/);
});

test('only approved public routes can be measured', () => {
  for (const route of [
    '/magina',
    '/magina/directorio',
    '/magina/tiempo',
    '/magina/campo',
    '/magina/noticias',
    '/magina/mercado',
  ]) {
    assert.ok(measurementSource.includes(`'${route}'`), `missing public growth route: ${route}`);
  }

  for (const privateRoute of ['/cuenta', '/calendario', '/onboarding', '/register', '/reset-password']) {
    assert.ok(!measurementSource.includes(`'${privateRoute}'`), `private route leaked into growth allowlist: ${privateRoute}`);
  }
});

test('measurement payload contains no private account or farm identifiers', () => {
  assert.match(measurementSource, /event: input\.event/);
  assert.match(measurementSource, /route: input\.route/);
  assert.match(measurementSource, /source: trimAttribution/);
  assert.match(measurementSource, /referrerHost/);
  assert.doesNotMatch(measurementSource, /userId|email|farmId|plotId|campaignId|documentId|sessionId|deviceId/i);
});

test('consent UI explains scope and is mounted only with public pages', () => {
  assert.match(consentSource, /Solo necesario/);
  assert.match(consentSource, /Permitir medición anónima/);
  assert.match(consentSource, /No medimos fincas, campañas, documentos ni datos personales/);
  assert.match(consentSource, /magina:public-growth-event/);
  assert.equal((mainSource.match(/\{publicMeasurement\}/g) ?? []).length, 6);
  assert.ok(mainSource.indexOf("path === '/cuenta'") < mainSource.indexOf("path === '/magina'"));
  assert.ok(mainSource.indexOf("path === '/calendario'") < mainSource.indexOf("path === '/magina'"));
});
