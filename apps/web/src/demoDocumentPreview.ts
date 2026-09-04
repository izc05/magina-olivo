const DEMO_ENABLED = import.meta.env.VITE_DEMO_MODE === 'true';

type DemoDocument = {
  id: string;
  campaignId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string | null;
  documentType: string;
  deliveryId: string | null;
  delivery: {
    id: string;
    deliveredAt: string | null;
    kilograms: string | null;
    destination: string | null;
  } | null;
  createdAt: string;
};

const documents: DemoDocument[] = [
  {
    id: 'demo-document-1',
    campaignId: 'demo-campaign-1',
    filename: 'ticket-entrega-0184.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 184_320,
    sha256: null,
    documentType: 'ticket',
    deliveryId: 'demo-delivery-1',
    delivery: {
      id: 'demo-delivery-1',
      deliveredAt: '2026-11-24T09:20:00.000Z',
      kilograms: '3280',
      destination: 'Cooperativa de Huelma',
    },
    createdAt: '2026-11-24T09:30:00.000Z',
  },
  {
    id: 'demo-document-2',
    campaignId: 'demo-campaign-1',
    filename: 'rendimiento-entrega-0241.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245_760,
    sha256: null,
    documentType: 'yield_report',
    deliveryId: 'demo-delivery-2',
    delivery: {
      id: 'demo-delivery-2',
      deliveredAt: '2026-12-02T16:10:00.000Z',
      kilograms: '4120',
      destination: 'Cooperativa de Huelma',
    },
    createdAt: '2026-12-03T10:15:00.000Z',
  },
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-magina-demo-preview': '1' },
  });
}

function urlOf(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, window.location.origin);
  if (input instanceof URL) return input;
  return new URL(input.url, window.location.origin);
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function fileSize(input: RequestInfo | URL, init?: RequestInit): number {
  if (init?.body instanceof Blob) return init.body.size;
  if (typeof Request !== 'undefined' && input instanceof Request) {
    const length = input.headers.get('content-length');
    if (length) return Number(length) || 0;
  }
  return 0;
}

async function handleDocumentApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const url = urlOf(input);
  const method = methodOf(input, init);
  const collection = url.pathname.match(/^\/api\/v1\/holdings\/([^/]+)\/documents$/);

  if (collection && method === 'GET') {
    const campaignId = url.searchParams.get('campaignId');
    return json({ items: documents.filter((item) => !campaignId || item.campaignId === campaignId) });
  }

  if (collection && method === 'POST') {
    const deliveryId = url.searchParams.get('deliveryId');
    const filename = url.searchParams.get('filename') || 'ticket-demo.pdf';
    const mimeType = url.searchParams.get('mimeType') || 'application/pdf';
    const documentType = url.searchParams.get('documentType') || 'ticket';
    const delivery = deliveryId === 'demo-delivery-2'
      ? { id: deliveryId, deliveredAt: '2026-12-02T16:10:00.000Z', kilograms: '4120', destination: 'Cooperativa de Huelma' }
      : { id: deliveryId || 'demo-delivery-1', deliveredAt: '2026-11-24T09:20:00.000Z', kilograms: '3280', destination: 'Cooperativa de Huelma' };
    const created: DemoDocument = {
      id: `demo-document-${Date.now()}`,
      campaignId: 'demo-campaign-1',
      filename,
      mimeType,
      sizeBytes: fileSize(input, init) || 128_000,
      sha256: null,
      documentType,
      deliveryId,
      delivery,
      createdAt: new Date().toISOString(),
    };
    documents.unshift(created);
    return json(created, 201);
  }

  return null;
}

/** Adds the private-document review path to GitHub Pages demo mode only. */
export function installDemoDocumentPreview() {
  if (!DEMO_ENABLED || typeof window === 'undefined') return;
  const previousFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const mocked = await handleDocumentApi(input, init);
    if (mocked) return mocked;
    return previousFetch(input, init);
  }) as typeof window.fetch;
}
