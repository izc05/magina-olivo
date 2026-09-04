import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { buildVapidAuthorization } from './web-push-empty.ts';

function decodeJsonSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}

test('VAPID authorization uses ES256 raw signature and endpoint origin as audience', () => {
  const previous = {
    publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
    subject: process.env.WEB_PUSH_VAPID_SUBJECT,
  };

  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  assert.equal(jwk.kty, 'EC');
  assert.equal(jwk.crv, 'P-256');
  assert.ok(jwk.x && jwk.y && jwk.d);

  process.env.WEB_PUSH_VAPID_PUBLIC_KEY = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]).toString('base64url');
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY = jwk.d;
  process.env.WEB_PUSH_VAPID_SUBJECT = 'mailto:push-test@example.com';

  try {
    const now = new Date('2026-09-04T20:00:00.000Z');
    const result = buildVapidAuthorization('https://push.example.com/send/abc', now);
    assert.equal(result.audience, 'https://push.example.com');
    assert.match(result.authorization, /^vapid t=[^.]+\.[^.]+\.[^,]+, k=/);

    const token = result.authorization.slice('vapid t='.length).split(', k=')[0];
    assert.ok(token);
    const [headerSegment, payloadSegment, signatureSegment] = token.split('.');
    assert.ok(headerSegment && payloadSegment && signatureSegment);

    const header = decodeJsonSegment(headerSegment);
    const payload = decodeJsonSegment(payloadSegment);
    assert.equal(header.alg, 'ES256');
    assert.equal(header.typ, 'JWT');
    assert.equal(payload.aud, 'https://push.example.com');
    assert.equal(payload.sub, 'mailto:push-test@example.com');
    assert.equal(payload.exp, Math.floor(now.getTime() / 1000) + 12 * 60 * 60);
    assert.equal(Buffer.from(signatureSegment, 'base64url').length, 64);
  } finally {
    if (previous.publicKey == null) delete process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    else process.env.WEB_PUSH_VAPID_PUBLIC_KEY = previous.publicKey;
    if (previous.privateKey == null) delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    else process.env.WEB_PUSH_VAPID_PRIVATE_KEY = previous.privateKey;
    if (previous.subject == null) delete process.env.WEB_PUSH_VAPID_SUBJECT;
    else process.env.WEB_PUSH_VAPID_SUBJECT = previous.subject;
  }
});
