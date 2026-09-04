import { useEffect, useState } from 'react';
import { AdminCommandCenterPage } from './AdminCommandCenterPage';
import { AdminCommandShortcuts } from './AdminCommandShortcuts';
import { AdminDelegatedHomePage } from './AdminDelegatedHomePage';
import { AdminOperationsPage } from './AdminOperationsPage';
import { AdminOperationsScopedPage } from './AdminOperationsScopedPage';
import { AdminSupportInboxPage } from './AdminSupportInboxPage';
import { AdminSupportSystemPage } from './AdminSupportSystemPage';
import type { AdminAccess } from './admin-access-client';
import { fetchAdminAccess, isSuperadmin } from './admin-access-client';

type EntryKind = 'home' | 'support' | 'operations';
type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

export function AdminRoleEntry({ kind }: { kind: EntryKind }) {
  const [state, setState] = useState<LoadState>('loading');
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminAccess()
      .then((result) => {
        setAccess(result);
        setState('ready');
      })
      .catch((reason) => {
        const status = (reason as { status?: number }).status;
        if (status === 401 || status === 403) setState('forbidden');
        else {
          setError(reason instanceof Error ? reason.message : 'No se ha podido comprobar el acceso.');
          setState('error');
        }
      });
  }, []);

  if (state === 'loading') return <main className="admin-loading" role="status">Comprobando permisos…</main>;
  if (state === 'forbidden') return <Restricted message="Esta cuenta no tiene un rol administrativo activo." />;
  if (state === 'error' || !access) return <Restricted message={error ?? 'No se ha podido comprobar el acceso.'} />;

  if (kind === 'home') {
    if (isSuperadmin(access)) {
      return <><AdminCommandCenterPage /><AdminCommandShortcuts /></>;
    }
    return <AdminDelegatedHomePage access={access} />;
  }

  if (kind === 'support') {
    if (isSuperadmin(access)) return <AdminSupportSystemPage />;
    if (access.capabilities.support) return <AdminSupportInboxPage />;
    return <Restricted message="Tu rol no incluye acceso a soporte." />;
  }

  if (isSuperadmin(access)) return <AdminOperationsPage />;
  if (access.capabilities.operations) return <AdminOperationsScopedPage />;
  return <Restricted message="Tu rol no incluye acceso a operaciones." />;
}

function Restricted({ message }: { message: string }) {
  return (
    <main className="admin-gate">
      <section className="admin-gate-card">
        <p className="admin-eyebrow">Mágina Olivo</p>
        <h1>Acceso restringido</h1>
        <p>{message}</p>
        <a className="admin-primary-link" href="/">Volver a la aplicación</a>
      </section>
    </main>
  );
}
