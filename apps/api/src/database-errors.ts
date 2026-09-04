export function isUniqueViolation(reason: unknown): boolean {
  return typeof reason === 'object'
    && reason !== null
    && 'code' in reason
    && (reason as { code?: unknown }).code === '23505';
}
