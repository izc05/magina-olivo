import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('buildApp HTTP logger retains operational logs without sensitive request data', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { buildApp } = await import(${JSON.stringify(new URL('./app.ts', import.meta.url).href)});
    const app = buildApp();
    // Exercise the real logger without contacting auth, mail or a database.
    app.addHook('onRequest', async (request, reply) => {
      reply.header('set-cookie', 'session=SET_COOKIE_SENTINEL');
      request.log.info({ req: { method: request.method, url: request.url,
        headers: request.headers }, res: { statusCode: 204,
        headers: { 'set-cookie': 'session=SET_COOKIE_SENTINEL' } } }, 'boundary probe');
      return reply.code(204).send();
    });
    for (const url of [
      '/api/auth/reset-password/SENSITIVE_RESET_TOKEN_SENTINEL',
      '/api/auth/reset-password/SENSITIVE_RESET_TOKEN_SENTINEL?callbackURL=https%3A%2F%2Fexample.test%2Freset-password',
      '/health/live?token=QUERY_TOKEN_SENTINEL&password=QUERY_PASSWORD_SENTINEL',
    ]) {
      await app.inject({ method: 'GET', url, headers: {
        authorization: 'Bearer AUTHORIZATION_SENTINEL', cookie: 'session=COOKIE_SENTINEL',
      } });
    }
    await app.close();
  `], {
    encoding: 'utf8',
    timeout: 20_000,
    env: { ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'info',
      DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test', AUTH_MAIL_TRANSPORT: 'disabled' },
  });
  assert.equal(child.status, 0, 'logger probe must complete');
  const output = child.stdout + child.stderr;
  for (const sentinel of ['SENSITIVE_RESET_TOKEN_SENTINEL', 'QUERY_TOKEN_SENTINEL',
    'QUERY_PASSWORD_SENTINEL', 'AUTHORIZATION_SENTINEL', 'COOKIE_SENTINEL', 'SET_COOKIE_SENTINEL']) {
    assert.equal(output.includes(sentinel), false, `logger leaked ${sentinel}`);
  }
  const records = child.stdout.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(records.filter(r => r.msg === 'incoming request').length, 3);
  assert.equal(records.filter(r => r.msg === 'request completed').length, 3);
  assert.ok(records.some(r => r.reqId && r.res?.statusCode === 204));
});
