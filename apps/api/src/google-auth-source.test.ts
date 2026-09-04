import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const authSource = await readFile(new URL('./auth.ts', import.meta.url), 'utf8');
const entrySource = await readFile(new URL('../../web/src/RegistrationEntry.tsx', import.meta.url), 'utf8');
const helperSource = await readFile(new URL('../../web/src/google-auth.ts', import.meta.url), 'utf8');

test('Google OAuth is opt-in and keeps email/password enabled', () => {
  assert.match(authSource, /GOOGLE_CLIENT_ID/);
  assert.match(authSource, /GOOGLE_CLIENT_SECRET/);
  assert.match(authSource, /socialProviders/);
  assert.match(authSource, /emailAndPassword:\s*\{\s*enabled:\s*true/s);
});

test('same-email Google identities can reuse the existing user account', () => {
  assert.match(authSource, /accountLinking/);
  assert.match(authSource, /disableImplicitLinking:\s*false/);
  assert.match(authSource, /allowDifferentEmails:\s*false/);
});

test('unauthenticated entry offers Google and sends new users to onboarding', () => {
  assert.match(entrySource, /Continuar con Google/);
  assert.match(entrySource, /startGoogleSignIn/);
  assert.match(helperSource, /provider:\s*'google'/);
  assert.match(helperSource, /newUserCallbackURL:\s*options\.newUserCallbackURL \?\? '\/onboarding'/);
  assert.match(helperSource, /credentials:\s*'include'/);
});
