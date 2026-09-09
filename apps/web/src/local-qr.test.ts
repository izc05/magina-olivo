import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { encodeRewardQr, qrMatrixToPath } from './local-qr.ts';

const SAMPLE_TOKEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdef';

test('encodes a 43-character reward token as deterministic QR v4-M matrix', () => {
  const matrix = encodeRewardQr(SAMPLE_TOKEN);
  assert.equal(matrix.length, 33);
  assert.ok(matrix.every((row) => row.length === 33));

  const flattened = matrix.flat().map((value) => (value ? '1' : '0')).join('');
  assert.equal(
    createHash('sha256').update(flattened).digest('hex'),
    '869e800143d6f5b2be9e1bd2de3a4f4c64c85a94182940cbaae45a2eab2e6c9e',
  );
});

test('rejects payloads beyond the bounded reward QR byte capacity', () => {
  assert.throws(
    () => encodeRewardQr('x'.repeat(63)),
    /REWARD_QR_PAYLOAD_LENGTH:63/,
  );
});

test('renders the QR as an SVG path without embedding the plaintext token', () => {
  const path = qrMatrixToPath(encodeRewardQr(SAMPLE_TOKEN));
  assert.match(path, /^M/);
  assert.doesNotMatch(path, new RegExp(SAMPLE_TOKEN));
});
