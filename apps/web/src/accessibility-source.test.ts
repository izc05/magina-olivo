import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('primary SPA navigation keeps programmatic focus and current-page semantics', async () => {
  const app = await source('./App.tsx');

  assert.match(app, /tabIndex=\{-1\}/);
  assert.match(app, /pageRef\.current\?\.focus/);
  assert.match(app, /aria-current=\{active \? 'page' : undefined\}/);
  assert.match(app, /aria-current=\{tab === 'campaign' \? 'page' : undefined\}/);
  assert.match(app, /aria-pressed=\{farm\.id === selectedFarmId\}/);
});

test('global styles preserve visible focus and user motion/contrast preferences', async () => {
  const styles = await source('./styles.css');

  assert.match(styles, /:focus-visible/);
  assert.match(styles, /outline:\s*3px solid var\(--focus-ring\)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /\.yield-form button \{[^}]*min-height:\s*44px/s);
});

test('ticket upload after delivery remains a real keyboard-operable button', async () => {
  const delivery = await source('./DeliveryEntryCard.tsx');

  assert.match(delivery, /className="ticket-upload-button"/);
  assert.match(delivery, /type="button"/);
  assert.match(delivery, /inputRef\.current\?\.click\(\)/);
  assert.match(delivery, /aria-live="polite"/);
  assert.match(delivery, /aria-busy=\{busy\}/);
});

test('login keeps its visible form before the fixed registration entry in keyboard order', async () => {
  const main = await source('./main.tsx');

  assert.ok(main.indexOf('<App />') < main.indexOf('<RegistrationEntry />'));
});

test('PWA updates are announced and can only be applied through an accessible user action', async () => {
  const prompt = await source('./PwaUpdatePrompt.tsx');

  assert.match(prompt, /onNeedRefresh/);
  assert.match(prompt, /applyPwaUpdateWhenSafe/);
  assert.match(prompt, /role="status"/);
  assert.match(prompt, /aria-live="polite"/);
  assert.match(prompt, /type="button"/);
  assert.match(prompt, /Actualizar ahora/);
});
