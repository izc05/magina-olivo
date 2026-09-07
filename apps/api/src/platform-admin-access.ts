export const PLATFORM_ADMIN_ROLES = ['super_admin', 'admin', 'editor', 'support'] as const;

export type PlatformAdminRole = typeof PLATFORM_ADMIN_ROLES[number];

export function isPlatformAdminRole(value: unknown): value is PlatformAdminRole {
  return typeof value === 'string' && PLATFORM_ADMIN_ROLES.includes(value as PlatformAdminRole);
}

export function canAccessPlatformConsole(role: PlatformAdminRole | null): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'editor' || role === 'support';
}
