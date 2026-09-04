import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('advertiser portal and commercial access console are routed separately from admin', async () => {
  const main = await read('./main.tsx');
  const portal = await read('./AdvertiserPortalPage.tsx');
  const admin = await read('./AdminAdvertiserAccessPage.tsx');

  assert.match(main, /path === '\/anunciante'/);
  assert.match(main, /<AdvertiserPortalPage \/>/);
  assert.match(main, /path === '\/admin\/anunciantes'/);
  assert.match(main, /<AdminAdvertiserAccessPage \/>/);
  assert.doesNotMatch(portal, /href="\/admin/);
  assert.match(admin, /rol Comercial o Superadmin|Acceso comercial requerido/i);
});

test('advertiser portal shows only own commercial metrics contract billing and moderated profile changes', async () => {
  const portal = await read('./AdvertiserPortalPage.tsx');

  assert.match(portal, /\/api\/v1\/advertiser\/access/);
  assert.match(portal, /\/api\/v1\/advertiser\/dashboard\?advertiserId=/);
  assert.match(portal, /Impresiones · 30 días/);
  assert.match(portal, /WhatsApp/);
  assert.match(portal, /Plan y renovación/);
  assert.match(portal, /Estado comercial/);
  assert.match(portal, /Enviar cambios para revisión/);
  assert.match(portal, /La ficha pública no se modifica hasta que sean aprobados/);
  assert.match(portal, /sin acceder a datos agrícolas de ningún usuario/i);
});

test('viewer is represented as read-only and advertiser edits never write public profile directly', async () => {
  const portal = await read('./AdvertiserPortalPage.tsx');

  assert.match(portal, /canRequestChanges/);
  assert.match(portal, /Acceso de solo lectura/);
  assert.match(portal, /\/api\/v1\/advertiser\/profile-change-requests/);
  assert.doesNotMatch(portal, /\/api\/v1\/admin\/advertising\/campaigns/);
  assert.doesNotMatch(portal, /\/api\/v1\/admin\/directory/);
});

test('commercial console manages account links and review without granting platform admin', async () => {
  const page = await read('./AdminAdvertiserAccessPage.tsx');
  const delegated = await read('./AdminDelegatedHomePage.tsx');
  const shortcuts = await read('./AdminCommandShortcuts.tsx');

  assert.match(page, /portal-memberships/);
  assert.match(page, /advertiser-profile-changes/);
  assert.match(page, /Conocer el correo de contacto no concede acceso automáticamente/);
  assert.match(page, /Owner\/Editor\/Viewer son roles del negocio, no roles administrativos/);
  assert.match(delegated, /href="\/admin\/anunciantes"/);
  assert.match(shortcuts, /href="\/admin\/anunciantes"/);
});
