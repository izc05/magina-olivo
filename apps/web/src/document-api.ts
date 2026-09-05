import { ApiError } from './api.ts';

export type UploadedDocument = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string | null;
  documentType: 'ticket' | 'delivery_note' | 'yield_report' | 'invoice' | 'settlement' | 'photo' | 'other' | string;
  deliveryId: string | null;
  delivery: {
    id: string;
    deliveredAt: string | null;
    kilograms: string | null;
    destination: string | null;
  } | null;
  createdAt: string;
};

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TICKET_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

async function parseDocumentError(response: Response): Promise<never> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const payload = await response.json() as { error?: { message?: string; code?: string } };
    message = payload.error?.message ?? message;
    code = payload.error?.code;
  } catch {
    // Keep the generic HTTP message.
  }
  throw new ApiError(message, response.status, code);
}

export async function listCampaignDocuments(
  holdingId: string,
  campaignId: string,
): Promise<UploadedDocument[]> {
  const params = new URLSearchParams({ campaignId });
  const response = await fetch(`/api/v1/holdings/${holdingId}/documents?${params.toString()}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) return parseDocumentError(response);
  const payload = await response.json() as { items: UploadedDocument[] };
  return payload.items;
}

export function privateDocumentContentUrl(documentId: string): string {
  return `/api/v1/documents/${documentId}/content`;
}

export async function uploadDeliveryTicket(
  holdingId: string,
  deliveryId: string,
  file: File,
): Promise<UploadedDocument> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('El ticket necesita conexión para subirse de forma privada.');
  }
  if (file.size <= 0) throw new Error('El archivo está vacío.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('El ticket supera el máximo de 10 MB.');
  if (!ALLOWED_TICKET_TYPES.has(file.type)) {
    throw new Error('Usa una foto JPG/PNG/WEBP o un PDF para el ticket.');
  }

  const params = new URLSearchParams({
    filename: file.name || 'ticket',
    mimeType: file.type,
    documentType: 'ticket',
    deliveryId,
  });

  const response = await fetch(`/api/v1/holdings/${holdingId}/documents?${params.toString()}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) return parseDocumentError(response);
  const document = await response.json() as UploadedDocument;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('magina:document-uploaded', { detail: { deliveryId, documentId: document.id } }));
  }
  return document;
}
