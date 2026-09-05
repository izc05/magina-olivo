import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('minimal pilot alerts are mounted only in the private app shell', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /import \{ PilotAlerts \} from '\.\/PilotAlerts'/);
  assert.match(main, /<PilotAlerts \/>/);
  assert.match(main, /import '\.\/pilot-alerts\.css'/);
});

test('pilot alerts reuse persisted preferences, backend campaign summary, private rain alarms and public AEMET context', async () => {
  const alerts = await read('./PilotAlerts.tsx');

  assert.match(alerts, /\/api\/v1\/account\/preferences/);
  assert.match(alerts, /\/api\/v1\/account\/rain-alerts/);
  assert.match(alerts, /\/api\/v1\/campaigns\/\$\{campaign\.id\}\/summary/);
  assert.match(alerts, /pendingResultCount > 0/);
  assert.match(alerts, /notifyPendingYield/);
  assert.match(alerts, /notifyWeather/);
  assert.match(alerts, /rainAlertResult\.items\.slice\(0, 2\)/);
  assert.match(alerts, /rain\.precipitationProbabilityPercent/);
  assert.match(alerts, /rain\.thresholdPercent/);
  assert.match(alerts, /Alarma de lluvia/);
  assert.match(alerts, /temperatureMinC <= preferenceResult\.weatherFrostCThreshold/);
  assert.match(alerts, /windMaxKmh >= preferenceResult\.weatherWindKmhThreshold/);
  assert.match(alerts, /freshness\.status === 'fresh' \|\| weather\.freshness\.status === 'aging'/);
  assert.match(alerts, /source\.attribution/);
  assert.match(alerts, /scopeNote/);
  assert.doesNotMatch(alerts, /AEMET_API_KEY/);
});

test('weather alert failures remain non-blocking for private agricultural data', async () => {
  const alerts = await read('./PilotAlerts.tsx');
  assert.match(alerts, /\/api\/v1\/account\/rain-alerts'\)\.catch\(\(\) => null\)/);
  assert.match(alerts, /Frost and wind are contextual and must never block private agricultural data/);
  assert.match(alerts, /catch \{/);
});
