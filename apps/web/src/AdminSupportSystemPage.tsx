import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type Ticket = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  category: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
  notesCount: number;
};

type LegalDocument = {
  id: string;
  documentKey: 'privacy' | 'cookies' | 'terms';
  version: string;
  title: string;
  contentText: string;
  status: 'draft' | 'active' | 'archived';
  effectiveAt: string | null;
};

type Evidence = {
  key: 'database_backup' | 'private_objects_backup' | 'restore_drill' | 'release_rollback';
  status: 'unknown' | 'ok' | 'warning' | 'failed';
  lastCheckedAt: string | null;
  summary: string | null;
  source: string;
};

type SystemResponse = {
  items: Evidence[];
  capabilities: { databaseBackup: string; restoreDrill: string; browserRestoreExecution: false };
  safety: string;
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

const legalLabels = { privacy: 'Privacidad', cookies: 'Cookies', terms: 'Términos y condiciones' } as const;
const evidenceLabels: Record<Evidence['key'], string> = {
  database_backup: 'Backup de PostgreSQL',
  private_objects_backup: 'Backup de documentos privados',
  restore_drill: 'Simulacro de restauración',
  release_rollback: 'Despliegue y rollback',
};

async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
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

export function AdminSupportSystemPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [system, setSystem] = useState<SystemResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const [legalKey, setLegalKey] = useState<LegalDocument['documentKey']>('privacy');
  const [legalVersion, setLegalVersion] = useState('1.0');
  const [legalTitle, setLegalTitle] = useState('Política de privacidad');
  const [legalText, setLegalText] = useState('');
  const [legalStatus, setLegalStatus] = useState<LegalDocument['status']>('draft');
  const [legalEffectiveAt, setLegalEffectiveAt] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ticketResult, legalResult, systemResult] = await Promise.all([
        adminRequest<{ items: Ticket[] }>('/api/v1/admin/support/tickets'),
        adminRequest<{ items: LegalDocument[] }>('/api/v1/admin/legal/documents'),
        adminRequest<SystemResponse>('/api/v1/admin/system/operations'),
      ]);
      setTickets(ticketResult.items);
      setDocuments(legalResult.items);
      setSystem(systemResult);
      setSelectedTicketId((current) => current || ticketResult.items[0]?.id || '');
      setState('ready');
    } catch (reason) {
      const code = (reason as { status?: number }).status;
      if (code === 401 || code === 403) setState('forbidden');
      else {
        setError(reason instanceof Error ? reason.message : 'No se ha podido cargar la gestión.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  async function patchTicket(ticket: Ticket, patch: Partial<Pick<Ticket, 'status' | 'priority'>>) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminRequest(`/api/v1/admin/support/tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setNotice('Ticket actualizado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el ticket.');
    } finally { setBusy(false); }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket || !internalNote.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminRequest(`/api/v1/admin/support/tickets/${selectedTicket.id}/notes`, {
        method: 'POST', body: JSON.stringify({ note: internalNote }),
      });
      setInternalNote('');
      setNotice('Nota interna añadida.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido añadir la nota.');
    } finally { setBusy(false); }
  }

  async function createLegal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminRequest('/api/v1/admin/legal/documents', {
        method: 'POST',
        body: JSON.stringify({
          documentKey: legalKey,
          version: legalVersion,
          title: legalTitle,
          contentText: legalText,
          status: legalStatus,
          effectiveAt: legalEffectiveAt ? new Date(legalEffectiveAt).toISOString() : null,
        }),
      });
      setLegalText('');
      setLegalStatus('draft');
      setNotice('Documento legal guardado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar el documento legal.');
    } finally { setBusy(false); }
  }

  async function setLegalDocumentStatus(item: LegalDocument, status: LegalDocument['status']) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminRequest(`/api/v1/admin/legal/documents/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(status === 'active' ? 'Versión legal activada.' : 'Estado legal actualizado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cambiar el estado legal.');
    } finally { setBusy(false); }
  }

  async function setEvidence(item: Evidence, status: Evidence['status']) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminRequest(`/api/v1/admin/system/operations/${item.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, summary: status === 'ok' ? 'Evidencia revisada manualmente desde el panel.' : item.summary }),
      });
      setNotice('Evidencia operativa actualizada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar la evidencia.');
    } finally { setBusy(false); }
  }

  if (state === 'loading') return <main className="admin-loading" role="status">Abriendo soporte, legal y sistema…</main>;
  if (state === 'forbidden') return <main className="admin-gate"><section className="admin-gate-card"><h1>Acceso restringido</h1><p>Se necesita autorización global de Mágina Olivo.</p><a className="admin-primary-link" href="/">Volver</a></section></main>;
  if (state === 'error') return <main className="admin-gate"><section className="admin-gate-card"><h1>No se ha podido cargar</h1><p>{error}</p><button className="admin-primary-button" onClick={() => void load()}>Reintentar</button></section></main>;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><span className="admin-brand-mark">MO</span><span><strong>Mágina Olivo</strong><small>Soporte · Legal · Sistema</small></span></a>
        <nav aria-label="Soporte legal y sistema">
          <a href="#soporte">Soporte</a>
          <a href="#legal">Legal</a>
          <a href="#sistema">Sistema</a>
          <a href="/admin/contenido">Contenido</a>
          <a href="/admin/operaciones">Operaciones</a>
          <a href="/admin">Panel principal</a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><div><p className="admin-eyebrow">Gestión diaria</p><h1>Soporte, legal y sistema</h1></div><button className="admin-ghost-button" disabled={busy} onClick={() => void load()}>Actualizar</button></header>
        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section id="soporte" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Bandeja</p><h2>Contacto y soporte</h2><p>Mensajes de ayuda, comerciales y de privacidad. Nunca se deben solicitar contraseñas ni tokens.</p></div><span className="admin-count">{tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length} abiertos</span></div>
          <div className="admin-two-column admin-support-grid">
            <div className="admin-card admin-support-list">
              {tickets.length ? tickets.map((ticket) => (
                <button key={ticket.id} type="button" className={selectedTicketId === ticket.id ? 'active' : ''} onClick={() => setSelectedTicketId(ticket.id)}>
                  <strong>{ticket.subject}</strong><span className={`admin-source-state ${ticket.priority === 'urgent' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'muted'}`}>{ticket.priority}</span><small>{ticket.requesterName} · {ticket.category} · {new Date(ticket.createdAt).toLocaleDateString('es-ES')}</small>
                </button>
              )) : <p className="admin-empty">No hay mensajes.</p>}
            </div>
            <div className="admin-card admin-support-detail">
              {selectedTicket ? <>
                <div className="admin-card-heading"><h3>{selectedTicket.subject}</h3><span>{selectedTicket.status}</span></div>
                <p>{selectedTicket.message}</p>
                <small>{selectedTicket.requesterName} · {selectedTicket.requesterEmail} · {selectedTicket.notesCount} notas internas</small>
                <div className="admin-form-row">
                  <label>Estado<select value={selectedTicket.status} disabled={busy} onChange={(event) => void patchTicket(selectedTicket, { status: event.target.value as Ticket['status'] })}><option value="new">Nuevo</option><option value="in_progress">En curso</option><option value="waiting_user">Esperando usuario</option><option value="resolved">Resuelto</option><option value="closed">Cerrado</option></select></label>
                  <label>Prioridad<select value={selectedTicket.priority} disabled={busy} onChange={(event) => void patchTicket(selectedTicket, { priority: event.target.value as Ticket['priority'] })}><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
                </div>
                <form className="admin-form" onSubmit={addNote}><label>Nota interna<textarea rows={3} maxLength={4000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="No visible para el usuario." /></label><button className="admin-primary-button" disabled={busy || !internalNote.trim()}>Añadir nota</button></form>
              </> : <p className="admin-empty">Selecciona un ticket.</p>}
            </div>
          </div>
        </section>

        <section id="legal" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Cumplimiento</p><h2>Documentos legales versionados</h2><p>No se ha precargado ningún texto jurídico. Solo se publica una versión cuando la activas expresamente tras su revisión.</p></div></div>
          <div className="admin-two-column admin-support-grid">
            <form className="admin-card admin-form" onSubmit={createLegal}>
              <div className="admin-card-heading"><h3>Nueva versión</h3><span>Borrador recomendado</span></div>
              <div className="admin-form-row"><label>Documento<select value={legalKey} onChange={(event) => { const key = event.target.value as LegalDocument['documentKey']; setLegalKey(key); setLegalTitle(legalLabels[key]); }}><option value="privacy">Privacidad</option><option value="cookies">Cookies</option><option value="terms">Términos</option></select></label><label>Versión<input required maxLength={40} value={legalVersion} onChange={(event) => setLegalVersion(event.target.value)} /></label></div>
              <label>Título<input required maxLength={180} value={legalTitle} onChange={(event) => setLegalTitle(event.target.value)} /></label>
              <label>Texto revisado<textarea required minLength={20} maxLength={50000} rows={9} value={legalText} onChange={(event) => setLegalText(event.target.value)} placeholder="Pega aquí el documento ya revisado antes de activarlo." /></label>
              <div className="admin-form-row"><label>Estado<select value={legalStatus} onChange={(event) => setLegalStatus(event.target.value as LegalDocument['status'])}><option value="draft">Borrador</option><option value="active">Activo</option><option value="archived">Archivado</option></select></label><label>Vigente desde<input type="datetime-local" value={legalEffectiveAt} onChange={(event) => setLegalEffectiveAt(event.target.value)} /></label></div>
              <button className="admin-primary-button" disabled={busy}>Guardar versión</button>
            </form>
            <div className="admin-card admin-content-list">
              <div className="admin-card-heading"><h3>Versiones</h3><span>{documents.length}</span></div>
              {documents.length ? documents.map((item) => <article className="admin-content-item" key={item.id}><div><strong>{legalLabels[item.documentKey]} · v{item.version}</strong><p>{item.title}</p><small>{item.status}{item.effectiveAt ? ` · ${new Date(item.effectiveAt).toLocaleDateString('es-ES')}` : ''}</small></div><div className="admin-content-actions"><span className={`admin-source-state ${item.status === 'active' ? 'ok' : 'muted'}`}>{item.status}</span>{item.status !== 'active' ? <button disabled={busy} onClick={() => void setLegalDocumentStatus(item, 'active')}>Activar</button> : null}{item.status !== 'archived' ? <button disabled={busy} onClick={() => void setLegalDocumentStatus(item, 'archived')}>Archivar</button> : null}</div></article>) : <p className="admin-empty">Todavía no hay documentos legales. Esto impide publicar por error un texto no revisado.</p>}
            </div>
          </div>
        </section>

        <section id="sistema" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Infraestructura</p><h2>Backups y recuperación</h2><p>El panel muestra evidencia. Las operaciones de restauración permanecen deliberadamente fuera del navegador.</p></div></div>
          <div className="admin-system-evidence-grid">
            {system?.items.map((item) => <article className="admin-card admin-evidence-card" key={item.key}><div className="admin-card-heading"><h3>{evidenceLabels[item.key]}</h3><span className={`admin-source-state ${item.status === 'ok' ? 'ok' : item.status === 'failed' ? 'danger' : item.status === 'warning' ? 'warning' : 'muted'}`}>{item.status}</span></div><p>{item.summary ?? 'Sin resumen registrado.'}</p><small>{item.lastCheckedAt ? `Última comprobación: ${new Date(item.lastCheckedAt).toLocaleString('es-ES')}` : 'Aún sin comprobación real'} · {item.source}</small><div className="admin-content-actions"><button disabled={busy} onClick={() => void setEvidence(item, 'ok')}>Marcar revisado OK</button><button disabled={busy} onClick={() => void setEvidence(item, 'warning')}>Marcar revisar</button></div></article>)}
          </div>
          <div className="admin-system-safety"><strong>Protección de recuperación</strong><p>{system?.safety}</p><code>{system?.capabilities.databaseBackup}</code><code>{system?.capabilities.restoreDrill}</code><span>Restore desde navegador: {system?.capabilities.browserRestoreExecution ? 'habilitado' : 'NO habilitado'}</span></div>
        </section>
      </main>
    </div>
  );
}
