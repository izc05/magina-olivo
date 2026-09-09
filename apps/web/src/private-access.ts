export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/mi-campo';
  return value;
}

export function currentReturnTo(): string {
  return `${window.location.pathname}${window.location.search}`;
}
