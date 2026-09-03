import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// P0 source gate for the self-service registration and first-run onboarding journey.
async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('registration is reachable and uses Better Auth sign-up safely', async () => {
  const main = await read('./main.tsx');
  const register = await read('./RegisterPage.tsx');
  const entry = await read('./RegistrationEntry.tsx');

  assert.match(main, /path === '\/register'/);
  assert.match(main, /<RegisterPage \/>/);
  assert.match(main, /<RegistrationEntry \/>/);
  assert.match(register, /\/api\/auth\/sign-up\/email/);
  assert.match(register, /credentials: 'include'/);
  assert.match(register, /password\.length < 10/);
  assert.match(register, /window\.location\.assign\('\/onboarding'\)/);
  assert.doesNotMatch(register, /localStorage/);
  assert.match(entry, /response\.status === 401 \|\| response\.status === 403/);
});

test('onboarding keeps the grower setup resumable and non-blocking', async () => {
  const main = await read('./main.tsx');
  const onboarding = await read('./OnboardingPage.tsx');

  assert.match(main, /path === '\/onboarding'/);
  assert.match(main, /<OnboardingPage \/>/);
  assert.match(onboarding, /api\.me\(\)/);
  assert.match(onboarding, /api\.holdings\(\)/);
  assert.match(onboarding, /api\.createHolding/);
  assert.match(onboarding, /api\.createFarm/);
  assert.match(onboarding, /api\.createPlot/);
  assert.match(onboarding, /api\.createCampaign/);
  assert.match(onboarding, /Lo haré después/);
  assert.match(onboarding, /La cooperativa no es obligatoria/);
  assert.match(onboarding, /Entrar en Mágina Olivo/);
});
