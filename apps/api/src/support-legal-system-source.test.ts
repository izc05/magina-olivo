import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routes = await readFile(new URL('./support-legal-system-routes.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../../db/migrations/0024_support_legal_system.sql', import.meta.url), 'utf8');

test('public contact is bounded and never accepts secrets or attachments by contract', () => {
  assert.match(routes, /\/api\/v1\/public\/contact/);
  assert.match(routes, /additionalProperties: false/);
  assert.match(routes, /No envíes contraseñas, códigos de acceso ni tokens/);
  assert.doesNotMatch(contactBlock(), /attachment|file|password|token:/i);
});

test('support legal and system admin mutations remain protected and audited', () => {
  assert.match(routes, /requirePlatformAdmin/);
  assert.match(routes, /recordAdminAudit/);
  assert.match(routes, /support\.ticket_update/);
  assert.match(routes, /legal\.document_status/);
  assert.match(routes, /system\.evidence_update/);
});

test('legal publishing keeps only one active version per document key', () => {
  assert.match(migration, /legal_documents_one_active_per_key_uq/);
  assert.match(routes, /update legal_documents set status = 'archived'/);
  assert.match(routes, /where document_key = \$1 and status = 'active'/);
});

test('system admin surface exposes evidence but no browser restore execution', () => {
  assert.match(routes, /browserRestoreExecution: false/);
  assert.match(routes, /Restore operations are CLI\/operations-only/);
  assert.doesNotMatch(routes, /exec\(|spawn\(|staging-restore-gate\.sh.*POST|restore.*method:\s*'POST'/i);
  assert.match(migration, /Backup\/restore commands are intentionally not executed from the browser/);
});

function contactBlock(): string {
  const start = routes.indexOf("'/api/v1/public/contact'");
  const end = routes.indexOf("app.get('/api/v1/admin/support/tickets'");
  return routes.slice(start, end);
}
