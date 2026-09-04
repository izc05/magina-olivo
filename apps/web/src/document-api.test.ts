import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { listCampaignDocuments, privateDocumentContentUrl } from './document-api.ts';

test('lists campaign documents with authenticated same-origin credentials', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input: String(input), ...(init ? { init } : {}) });
    return new Response(JSON.stringify({
      items: [{
        id: 'doc-1',
        filename: 'ticket.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        sha256: null,
        documentType: 'ticket',
        deliveryId: 'delivery-1',
        delivery: {
          id: 'delivery-1',
          deliveredAt: '2026-01-12T08:30:00.000Z',
          kilograms: '1842',
          destination: 'Cooperativa',
        },
        createdAt: '2026-01-12T08:31:00.000Z',
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await listCampaignDocuments('holding-1', 'campaign-1');
    assert.equal(result.length, 1);
    assert.equal(result[0]?.filename, 'ticket.pdf');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, '/api/v1/holdings/holding-1/documents?campaignId=campaign-1');
    assert.equal(calls[0]?.init?.credentials, 'include');
    assert.equal(new Headers(calls[0]?.init?.headers).get('accept'), 'application/json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('builds private document content URLs without exposing storage keys', () => {
  assert.equal(privateDocumentContentUrl('doc-123'), '/api/v1/documents/doc-123/content');
});

test('campaign archive exposes the private harvest PDF next to CSV and JSON', async () => {
  const source = await readFile(new URL('./CampaignDocuments.tsx', import.meta.url), 'utf8');
  assert.match(source, /\/api\/v1\/campaigns\/\$\{campaignId\}\/export\.pdf/);
  assert.match(source, /Descargar informe PDF/);
  assert.match(source, /rendimiento ponderado/);
  assert.match(source, /no estima rendimientos/i);
});
