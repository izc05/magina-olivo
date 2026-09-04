export type PlatformAdminRole = 'superadmin' | 'commercial' | 'content' | 'support' | 'operations';

export type AdminCapabilities = {
  commandCenter: boolean;
  finance: boolean;
  advertising: boolean;
  content: boolean;
  support: boolean;
  operations: boolean;
  systemEvidence: boolean;
  legal: boolean;
  users: boolean;
  roles: boolean;
};

export type AdminAccess = {
  administrator: { email: string };
  roles: PlatformAdminRole[];
  bootstrapSuperadmin: boolean;
  capabilities: AdminCapabilities;
};

export async function adminAccessRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    try {
      const body = await response.json() as { error?: { message?: string }; message?: string };
      error.message = body.error?.message ?? body.message ?? error.message;
    } catch {
      // Keep generic HTTP status.
    }
    throw error;
  }
  return await response.json() as T;
}

export function fetchAdminAccess(): Promise<AdminAccess> {
  return adminAccessRequest<AdminAccess>('/api/v1/admin/access');
}

export function isSuperadmin(access: AdminAccess): boolean {
  return access.roles.includes('superadmin');
}
