import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('calendar route is authenticated-facing and wired to the task API', async () => {
  const main = await read('./main.tsx');
  const calendar = await read('./CalendarPage.tsx');
  const entry = await read('./RegistrationEntry.tsx');

  assert.match(main, /path === '\/calendario'/);
  assert.match(main, /<CalendarPage \/>/);
  assert.match(entry, /href="\/calendario"/);
  assert.match(calendar, /\/api\/v1\/holdings/);
  assert.match(calendar, /\/tasks\?status=all/);
  assert.match(calendar, /\/api\/v1\/tasks\/\$\{task\.id\}\/complete/);
});

test('calendar keeps agricultural scope, overdue visibility and write restrictions explicit', async () => {
  const calendar = await read('./CalendarPage.tsx');

  assert.match(calendar, /Tareas y calendario/);
  assert.match(calendar, /Organización del campo/);
  assert.match(calendar, /Tareas vencidas/);
  assert.match(calendar, /reminderDaysBefore/);
  assert.match(calendar, /priority/);
  assert.match(calendar, /activeHolding\.role !== 'viewer'/);
  assert.match(calendar, /solo lectura/);
  assert.doesNotMatch(calendar, /pushManager|Notification\.requestPermission/);
  assert.doesNotMatch(calendar, /Google Calendar|Outlook/);
});
