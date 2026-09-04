export function parsePlatformAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdminEmail(
  email: string | null | undefined,
  configured = process.env.MAGINA_ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parsePlatformAdminEmails(configured).has(email.trim().toLowerCase());
}
