import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { adminAccessRequest } from './admin-access-client';

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
  updatedAt: string;
  notesCount: number;
};

export function AdminSupportInboxPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => tickets.find((item) => item.id === selectedId) ?? null, [tickets, selectedId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await adminAccessRequest<{ items: Ticket[] }>('/api/v1/admin/delegated/support/tickets');
      setTickets(result.items);
      setSelectedId((current) => current || result.items[0]?.id || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar soporte.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function patchTicket(patch: Partial<Pick<Ticket, 'status' | 'priority'>>) {
    if (!selected) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminAccessRequest(`/api/v1/admin/delegated/support/tickets/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setNotice('Ticket actualizado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el ticket.');
    } finally { setBusy(false); }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !internalNote.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await adminAccessRequest(`/api/v1/admin/delegated/support/tickets/${selected.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: internalNote }),
      });
      setInternalNote('');
      setNotice('Nota interna añadida.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido añadir la nota.');
    } finally { setBusy(false); }
  }

  const openCount = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><span className="admin-brand-mark">MO</span><span><strong>Mágina Olivo</strong><small>Soporte delegado</small></span></a>
        <nav aria-label="Soporte delegado">
          <a href="#soporte">Bandeja</a>
          <a href="/admin">← Panel de trabajo</a>
        </nav>
        <div className="admin-sidebar-footer"><small>Permiso</small><span>Soporte</span></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-eyebrow">Atención al usuario</p><h1>Soporte</h1><p className="delegated-header-copy">Acceso limitado a tickets y notas internas.</p></div>
          <button className="admin-ghost-button" type="button" onClick={() => void load()} disabled={busy}>Actualizar</button>
        </header>

        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section id="soporte" className="admin-section admin-command-section-first">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">Bandeja</p><h2>Mensajes recibidos</h2><p>Los datos de contacto se muestran únicamente para atender la solicitud. Nunca se deben pedir contraseñas, códigos o tokens.</p></div>
            <span className="admin-count">{openCount} abiertos</span>
          </div>

          <div className="admin-two-column admin-support-grid">
            <div className="admin-card admin-support-list">
              {tickets.length ? tickets.map((ticket) => (
                <button key={ticket.id} type="button" className={selectedId === ticket.id ? 'active' : ''} onClick={() => setSelectedId(ticket.id)}>
                  <strong>{ticket.subject}</strong>
                  <span className={`admin-source-state ${ticket.priority === 'urgent' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'muted'}`}>{ticket.priority}</span>
                  <small>{ticket.requesterName} · {ticket.category} · {new Date(ticket.createdAt).toLocaleDateString('es-ES')}</small>
                </button>
              )) : <p className="admin-empty">No hay mensajes.</p>}
            </div>

            <div className="admin-card admin-support-detail">
              {selected ? <>
                <div className="admin-card-heading"><h3>{selected.subject}</h3><span>{selected.status}</span></div>
                <p>{selected.message}</p>
                <small>{selected.requesterName} · {selected.requesterEmail} · {selected.notesCount} notas internas</small>
                <div className="admin-form-row delegated-support-controls">
                  <label>Estado
                    <select value={selected.status} disabled={busy} onChange={(event) => void patchTicket({ status: event.target.value as Ticket['status'] })}>
                      <option value="new">Nuevo</option><option value="in_progress">En curso</option><option value="waiting_user">Esperando usuario</option><option value="resolved">Resuelto</option><option value="closed">Cerrado</option>
                    </select>
                  </label>
                  <label>Prioridad
                    <select value={selected.priority} disabled={busy} onChange={(event) => void patchTicket({ priority: event.target.value as Ticket['priority'] })}>
                      <option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                    </select>
                  </label>
                </div>
                <form className="admin-form" onSubmit={addNote}>
                  <label>Nota interna<textarea rows={4} maxLength={4000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Solo visible para administración." /></label>
                  <button className="admin-primary-button" disabled={busy || !internalNote.trim()}>Añadir nota</button>
                </form>
              </> : <p className="admin-empty">Selecciona un ticket.</p>}
            </div>
          </div>
        </section>

        <section className="delegated-admin-safety admin-card">
          <strong>Fuera de este permiso</strong>
          <p>Este perfil no puede publicar documentos legales, modificar evidencias del sistema, administrar roles ni consultar parcelas, entregas o documentos privados.</p>
        </section>
      </main>
    </div>
  );
}
