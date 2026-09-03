import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAllowedDocumentMimeType,
  normalizeDocumentFilename,
  normalizeDocumentMimeType,
} from './document-validation.ts';

test('accepts and normalizes safe V1 document MIME types', () => {
  assert.equal(normalizeDocumentMimeType(' APPLICATION/PDF '), 'application/pdf');
  assert.equal(normalizeDocumentMimeType('image/jpeg'), 'image/jpeg');
  assert.equal(normalizeDocumentMimeType('image/png'), 'image/png');
  assert.equal(normalizeDocumentMimeType('image/webp'), 'image/webp');
  assert.equal(normalizeDocumentMimeType('image/heic'), 'image/heic');
  assert.equal(normalizeDocumentMimeType('image/heif'), 'image/heif');
});

test('rejects active or unsupported document MIME types', () => {
  for (const mimeType of [
    'image/svg+xml',
    'text/html',
    'application/javascript',
    'application/x-msdownload',
    'application/octet-stream',
    '',
  ]) {
    assert.equal(isAllowedDocumentMimeType(mimeType), false, mimeType);
  }
});

test('normalizes filenames and rejects blank or path-like names', () => {
  assert.equal(normalizeDocumentFilename(' ticket-004281.pdf '), 'ticket-004281.pdf');
  assert.equal(normalizeDocumentFilename('   '), null);
  assert.equal(normalizeDocumentFilename('../ticket.pdf'), null);
  assert.equal(normalizeDocumentFilename('folder/ticket.pdf'), null);
  assert.equal(normalizeDocumentFilename('folder\\ticket.pdf'), null);
  assert.equal(normalizeDocumentFilename(`bad\0name.pdf`), null);
});
