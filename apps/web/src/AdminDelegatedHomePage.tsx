import { useEffect, useState } from 'react';
import type { AdminAccess } from './admin-access-client';
import { adminAccessRequest } from './admin-access-client';

type ScopedSummary = {
  commercial?: { activeContracts: number; billingNeedsAttention: number };
  content?: { activeAnnouncements: number; featuredNews: number };
  support?: { openTickets: number; urgentTickets: number };
  operations?: { sourcesWithErrors: number; directoryStale: number; evidencePending: number };
};

const roleLabels: Record<string, string> = {
  commercial: 'Comercial',
  content: 'Contenido',
  support: 'Soporte',
  operations: 'Operaciones',
};

export function AdminDelegatedHomePage({ access }: { access: AdminAccess }) {
  const [summary, setSummary] = useState<ScopedSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void adminAccessRequest<ScopedSummary>('/api/v1/admin/scoped-summary')
      .then(setSummary)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el resumen.'));
  }, []);

  return (
    <main className="delegated-admin-shell">
      <header className="delegated-admin-header">
        <div>
          <p className="admin-eyebrow">Mágina Olivo · Administración</p>
          <h1>Panel de trabajo</h1>
          <p>Acceso limitado a las funciones asignadas. El servidor bloquea el resto aunque se intente abrir una URL directa.</p>
        </div>
        <a href="/" className="admin-primary-link">Volver a la app</a>
      </header>

      <section className="delegated-admin-profile admin-card">
        <div>
          <small>Sesión administrativa</small>
          <strong>{access.administrator.email}</strong>
        </div>
        <div className="delegated-role-list">
          {access.roles.filter((role) => role !== 'superadmin').map((role) => (
            <span key={role}>{roleLabels[role] ?? role}</span>
          ))}
        </div>
      </section>

      {error ? <div className="admin-error" role="alert">{error}</div> : null}

      <section className="admin-section">
        <div className="admin-section-heading">
          <div><p className="admin-eyebrow">Permisos asignados</p><h2>Áreas disponibles</h2></div>
        </div>
        <div className="delegated-module-grid">
          {access.capabilities.finance ? (
            <DelegatedModule href="/admin/finanzas" title="Finanzas y contratos" detail={summary?.commercial ? `${summary.commercial.billingNeedsAttention} cobros requieren atención` : 'Gestión comercial'} />
          ) : null}
          {access.capabilities.content ? (
            <DelegatedModule href="/admin/contenido" title="Noticias y avisos" detail={summary?.content ? `${summary.content.activeAnnouncements} avisos activos · ${summary.content.featuredNews} noticias destacadas` : 'Gestión editorial'} />
          ) : null}
          {access.capabilities.support ? (
            <DelegatedModule href="/admin/soporte" title="Soporte" detail={summary?.support ? `${summary.support.openTickets} tickets abiertos · ${summary.support.urgentTickets} urgentes` : 'Bandeja de soporte'} attention={(summary?.support?.urgentTickets ?? 0) > 0} />
          ) : null}
          {access.capabilities.operations ? (
            <DelegatedModule href="/admin/operaciones" title="Operaciones" detail={summary?.operations ? `${summary.operations.sourcesWithErrors} fuentes con error · ${summary.operations.evidencePending} evidencias pendientes` : 'Directorio, fuentes y sistema'} attention={(summary?.operations?.sourcesWithErrors ?? 0) > 0} />
          ) : null}
        </div>
      </section>

      <section className="delegated-admin-safety admin-card">
        <strong>Separación de responsabilidades</strong>
        <p>Este perfil no recibe por defecto acceso a parcelas, entregas, documentos privados, textos legales, usuarios globales, sesiones ni gestión de roles.</p>
      </section>
    </main>
  );
}

function DelegatedModule({ href, title, detail, attention = false }: { href: string; title: string; detail: string; attention?: boolean }) {
  return (
    <a className={`delegated-module admin-card${attention ? ' attention' : ''}`} href={href}>
      <span aria-hidden="true">◆</span>
      <div><strong>{title}</strong><p>{detail}</p><small>Abrir módulo →</small></div>
    </a>
  );
}
