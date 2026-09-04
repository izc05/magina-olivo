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

function demoPdf(): string {
  const stream = 'BT /F1 18 Tf 50 790 Td (Magina Olivo - Informe demo de cosecha) Tj ET\nBT /F1 11 Tf 50 755 Td (Campana 2026/27 - resumen por parcelas) Tj ET\nBT /F1 10 Tf 50 725 Td (Las Vinas - Parcela Norte - 7.400 kg - rendimiento 22.1 %) Tj ET\n';
  const objects = [
    '',
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n%MGO-DEMO\n';
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

function demoCampaignExport(campaignId: string, format: 'pdf' | 'csv' | 'json'): Response {
  const filename = `magina-olivo-campana-demo-2026-27.${format}`;
  const commonHeaders = {
    'cache-control': 'private, no-store',
    'content-disposition': `attachment; filename="${filename}"`,
    'x-magina-demo-preview': '1',
  };

  if (format === 'pdf') {
    return new Response(demoPdf(), { status: 200, headers: { ...commonHeaders, 'content-type': 'application/pdf' } });
  }

  if (format === 'csv') {
    const csv = '\uFEFF"parcela","fecha","kilogramos","destino","rendimiento"\r\n"Parcela Norte","24/11/2026","3280","Cooperativa de Huelma","21.8"\r\n"Parcela Norte","02/12/2026","4120","Cooperativa de Huelma","22.4"\r\n';
    return new Response(csv, { status: 200, headers: { ...commonHeaders, 'content-type': 'text/csv; charset=utf-8' } });
  }

  return new Response(JSON.stringify({
    schemaVersion: 1,
    demo: true,
    campaign: { id: campaignId, name: 'Campaña 2026/27', seasonStartYear: 2026, seasonEndYear: 2027 },
    parcels: [{ name: 'Parcela Norte', kilograms: 7400, weightedYieldPercent: 22.1 }],
  }, null, 2), { status: 200, headers: { ...commonHeaders, 'content-type': 'application/json; charset=utf-8' } });
}

async function handleDocumentApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const url = urlOf(input);
  const method = methodOf(input, init);
  const collection = url.pathname.match(/^\/api\/v1\/holdings\/([^/]+)\/documents$/);
  const campaignExport = url.pathname.match(/^\/api\/v1\/campaigns\/([^/]+)\/export\.(pdf|csv|json)$/);

  if (campaignExport && method === 'GET') {
    return demoCampaignExport(campaignExport[1] ?? 'demo-campaign-1', campaignExport[2] as 'pdf' | 'csv' | 'json');
  }

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

/** Adds the private-document and campaign-export review paths to GitHub Pages demo mode only. */
export function installDemoDocumentPreview() {
  if (!DEMO_ENABLED || typeof window === 'undefined') return;
  const previousFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const mocked = await handleDocumentApi(input, init);
    if (mocked) return mocked;
    return previousFetch(input, init);
  }) as typeof window.fetch;
}
