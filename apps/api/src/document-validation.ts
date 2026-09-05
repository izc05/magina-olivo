const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export function normalizeDocumentFilename(value: string): string | null {
  const filename = value.trim();
  if (!filename || filename.length > 240) return null;
  if (filename.includes('\0') || filename.includes('/') || filename.includes('\\')) return null;
  return filename;
}

export function normalizeDocumentMimeType(value: string): string | null {
  const mimeType = value.trim().toLowerCase();
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) return null;
  return mimeType;
}

export function isAllowedDocumentMimeType(value: string): boolean {
  return normalizeDocumentMimeType(value) !== null;
}
