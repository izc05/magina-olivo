import assert from 'node:assert/strict';
import test from 'node:test';
import { queuePasswordResetEmail } from './auth-mailer.ts';

test('resend transport launches a non-blocking HTTPS request with idempotency and no API key in body', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_MAIL_TRANSPORT: process.env.AUTH_MAIL_TRANSPORT,
    AUTH_MAIL_FROM: process.env.AUTH_MAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };

  process.env.NODE_ENV = 'production';
  process.env.AUTH_MAIL_TRANSPORT = 'resend';
  process.env.AUTH_MAIL_FROM = 'Mágina Olivo <no-reply@example.test>';
  process.env.RESEND_API_KEY = 're_test_secret_never_real';

  let capturedInput = '';
  let capturedInit: RequestInit | undefined;
  let markFetchCalled: (() => void) | undefined;
  const fetchCalled = new Promise<void>((resolve) => {
    markFetchCalled = resolve;
  });

  globalThis.fetch = async (input, init) => {
    capturedInput = String(input);
    capturedInit = init;
    markFetchCalled?.();
    return new Response(JSON.stringify({ id: 'email-test-id' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = queuePasswordResetEmail({
      to: 'farmer@example.test',
      resetUrl: 'https://magina.example.test/reset-password?token=synthetic-reset-token',
    });

    assert.equal(result, undefined);
    await fetchCalled;

    assert.equal(capturedInput, 'https://api.resend.com/emails');
    assert.equal(capturedInit?.method, 'POST');

    const headers = capturedInit?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer re_test_secret_never_real');
    assert.match(headers['idempotency-key'] ?? '', /^password-reset-[0-9a-f]{64}$/);
    assert.equal(headers['content-type'], 'application/json');
    assert.equal(headers['user-agent'], 'magina-olivo/0.0.0');

    const body = JSON.parse(String(capturedInit?.body));
    assert.equal(body.from, 'Mágina Olivo <no-reply@example.test>');
    assert.deepEqual(body.to, ['farmer@example.test']);
    assert.match(body.subject, /Restablecer contraseña/);
    assert.match(body.text, /synthetic-reset-token/);
    assert.doesNotMatch(String(capturedInit?.body), /re_test_secret_never_real/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
