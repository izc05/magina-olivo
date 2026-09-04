import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });

if (!jwk.x || !jwk.y || !jwk.d) {
  throw new Error('Node did not export a complete P-256 JWK');
}

const publicKey = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(jwk.x, 'base64url'),
  Buffer.from(jwk.y, 'base64url'),
]).toString('base64url');

process.stdout.write([
  '# Copy these values into a secrets-managed env file. Do not commit them.',
  `WEB_PUSH_VAPID_PUBLIC_KEY=${publicKey}`,
  `WEB_PUSH_VAPID_PRIVATE_KEY=${jwk.d}`,
  'WEB_PUSH_VAPID_SUBJECT=mailto:admin@example.com',
  '',
].join('\n'));
