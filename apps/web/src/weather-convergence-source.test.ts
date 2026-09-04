import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Tiempo renders the persisted rain alert summary without duplicating rain rules', async () => {
  const page = await read('./MaginaWeatherPage.tsx');
  const summary = await read('./WeatherRainAlertSummary.tsx');

  assert.match(page, /WeatherRainAlertSummary/);
  assert.match(page, /<WeatherRainAlertSummary \/>/);
  assert.match(summary, /\/api\/v1\/me/);
  assert.match(summary, /\/api\/v1\/account\/rain-alerts/);
  assert.match(summary, /credentials: 'include'/);
  assert.match(summary, /items\.slice\(0, 2\)/);
  assert.match(summary, /Alarmas de lluvia/);
  assert.doesNotMatch(summary, /\/api\/v1\/public\/weather\?municipality=/);
  assert.doesNotMatch(summary, /AEMET_API_KEY/);
});

test('GitHub Pages weather preview supplies illustrative radar frames and rain alerts', async () => {
  const preview = await read('./weatherDemoPreview.ts');
  const main = await read('./main.tsx');

  assert.match(preview, /\/api\/v1\/public\/weather\/radar\/frames/);
  assert.match(preview, /\/api\/v1\/account\/rain-alerts/);
  assert.match(preview, /data:image\/svg\+xml/);
  assert.match(preview, /datos ilustrativos/);
  assert.match(preview, /automatic: false/);
  assert.doesNotMatch(preview, /AEMET_API_KEY/);

  const generalPreviewIndex = main.indexOf('installDemoPreview();');
  const weatherPreviewIndex = main.indexOf('installWeatherDemoPreview();');
  assert.ok(generalPreviewIndex >= 0, 'general demo preview must be installed');
  assert.ok(weatherPreviewIndex > generalPreviewIndex, 'weather preview must wrap the general demo preview');
});
