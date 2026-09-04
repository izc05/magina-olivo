import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routes = await readFile(new URL('./admin-finance-routes.ts', import.meta.url), 'utf8');
const access = await readFile(new URL('./admin-role-access.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../../db/migrations/0025_admin_finance_roles.sql', import.meta.url), 'utf8');

test('advertising finance is a commercial admin surface without payment execution', () => {
  assert.match(routes, /requireAdminRole\(request, reply, 'commercial'\)/);
  assert.match(routes, /\/api\/v1\/admin\/finance\/overview/);
  assert.match(routes, /advertising_billing_entries/);
  assert.doesNotMatch(routes, /stripe|paypal|redsys|paymentIntent|charge\(|capture\(/i);
});

test('plan pricing starts undefined rather than inventing commercial prices', () => {
  assert.match(migration, /amount_cents integer check \(amount_cents is null or amount_cents >= 0\)/);
  assert.match(migration, /select code, null, 'monthly', 'Precio comercial pendiente de definir\.'/);
  assert.doesNotMatch(migration, /\('featured'\s*,\s*\d+|\('premium'\s*,\s*\d+/i);
});

test('delegated roles preserve the environment bootstrap superadmin path', () => {
  assert.match(access, /isPlatformAdminEmail\(session\.user\.email\)/);
  assert.match(access, /bootstrapSuperadmin: true/);
  assert.match(routes, /BOOTSTRAP_SUPERADMIN_IMMUTABLE/);
  assert.match(routes, /ADMIN_SELF_ROLE_CHANGE_BLOCKED/);
});

test('billing records explicitly remain internal control rather than fiscal invoices', () => {
  assert.match(migration, /Internal billing control/);
  assert.match(migration, /does not generate a tax invoice/);
  assert.match(migration, /check \(status <> 'paid' or paid_at is not null\)/);
});
