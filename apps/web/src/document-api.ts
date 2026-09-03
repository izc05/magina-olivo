import { ApiError } from './api.ts';

export type UploadedDocument = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  documentType: 'ticket' | 'photo' | string;
  deliveryId: string | null;
  createdAt: string;
};

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TICKET_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

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

  if (!response.ok) {
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

  return await response.json() as UploadedDocument;
}
