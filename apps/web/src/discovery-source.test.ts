import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const generator = readFileSync(new URL('../scripts/generate-discovery.mjs', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts?: Record<string, string>;
};

test('web build generates public discovery assets', () => {
  assert.match(packageJson.scripts?.build ?? '', /generate-discovery\.mjs/);
  assert.match(generator, /sitemap\.xml/);
  assert.match(generator, /robots\.txt/);
  assert.match(generator, /llms\.txt/);
  assert.match(generator, /OAI-SearchBot/);
  assert.match(generator, /ChatGPT-User/);
  assert.match(generator, /SoftwareApplication/);
  assert.match(generator, /application\/ld\+json/);
});

test('local discovery routes and private exclusions remain explicit', () => {
  for (const publicRoute of [
    '/magina/mercado',
    '/magina/tiempo',
    '/magina/campo',
    '/magina/noticias',
    '/magina/directorio',
    '/precio-aceite-oliva-hoy',
    '/precio-aove-jaen',
    '/tiempo-sierra-magina',
    '/alertas-olivar-jaen',
    '/noticias-olivar-jaen',
    '/cooperativas-sierra-magina',
  ]) {
    assert.ok(generator.includes(publicRoute), `missing public discovery route: ${publicRoute}`);
  }

  for (const privateRoute of [
    '/api/',
    '/cuenta',
    '/calendario',
    '/onboarding',
    '/register',
    '/reset-password',
  ]) {
    assert.ok(generator.includes(privateRoute), `missing private crawler exclusion: ${privateRoute}`);
  }
});

test('sitemap is restricted to canonical routes', () => {
  assert.match(generator, /route\.path === route\.canonicalPath/);
  assert.match(generator, /rel=\\"canonical\\"/);
});
