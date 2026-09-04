export function normalizeAdminEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLocaleLowerCase('en-US') ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function configuredPlatformAdminEmails(value = process.env.MAGINA_ADMIN_EMAILS): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => normalizeAdminEmail(email))
      .filter((email): email is string => Boolean(email)),
  );
}

export function isConfiguredPlatformAdmin(
  email: string | null | undefined,
  configured = configuredPlatformAdminEmails(),
): boolean {
  const normalized = normalizeAdminEmail(email);
  return normalized !== null && configured.has(normalized);
}
