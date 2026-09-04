import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { adminAccessRequest } from './admin-access-client';

type DirectoryItem = {
  id: string;
  officialName: string;
  brandName: string | null;
  entityType: 'cooperative' | 'sat' | 'company' | 'other';
  municipality: string | null;
  province: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  sourceUrl: string | null;
  sourceCheckedAt: string | null;
  verificationStatus: 'unverified' | 'verified' | 'stale';
  updatedAt: string;
};

type SourceItem = {
  sourceKey: string;
  label: string;
  provider: string;
  active: boolean;
  sourceUpdatedAt: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  updateFrequency: string | null;
};

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  occurredAt: string;
};

type Evidence = {
  key: 'database_backup' | 'private_objects_backup' | 'restore_drill' | 'release_rollback';
  status: 'unknown' | 'ok' | 'warning' | 'failed';
  lastCheckedAt: string | null;
  summary: string | null;
  source: string;
  updatedAt: string;
};

const evidenceLabels: Record<Evidence['key'], string> = {
  database_backup: 'Backup PostgreSQL',
  private_objects_backup: 'Backup documentos privados',
  restore_drill: 'Simulacro de restauración',
  release_rollback: 'Despliegue y rollback',
};

function shortDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function sourceTone(source: SourceItem): string {
  if (!source.active) return 'muted';
  if (source.lastError) return 'danger';
  if (!source.lastCheckedAt) return 'warning';
  return 'ok';
}

export function AdminOperationsScopedPage() {
  const [directory, setDirectory] = useState<DirectoryItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => directory.find((item) => item.id === selectedId) ?? null, [directory, selectedId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [directoryResult, sourceResult, auditResult, systemResult] = await Promise.all([
        adminAccessRequest<{ items: DirectoryItem[] }>('/api/v1/admin/delegated/operations/directory'),
        adminAccessRequest<{ items: SourceItem[] }>('/api/v1/admin/delegated/operations/sources'),
        adminAccessRequest<{ items: AuditItem[] }>('/api/v1/admin/delegated/operations/audit'),
        adminAccessRequest<{ items: Evidence[] }>('/api/v1/admin/delegated/operations/system'),
      ]);
      setDirectory(directoryResult.items);
      setSources(sourceResult.items);
      setAudit(auditResult.items);
      setEvidence(systemResult.items);
      setSelectedId((current) => current || directoryResult.items[0]?.id || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar operaciones.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveDirectory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setNotice(null); setError(null);
    try {
      await adminAccessRequest(`/api/v1/admin/delegated/operations/directory/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          officialName: String(form.get('officialName') ?? ''),
          brandName: String(form.get('brandName') ?? '') || null,
          entityType: String(form.get('entityType') ?? 'other'),
          municipality: String(form.get('municipality') ?? '') || null,
          province: String(form.get('province') ?? '') || null,
          address: String(form.get('address') ?? '') || null,
          phone: String(form.get('phone') ?? '') || null,
          websiteUrl: String(form.get('websiteUrl') ?? '') || null,
          sourceUrl: String(form.get('sourceUrl') ?? '') || null,
          sourceCheckedAt: selected.sourceCheckedAt,
          verificationStatus: String(form.get('verificationStatus') ?? 'unverified'),
        }),
      });
      setNotice('Ficha pública actualizada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la ficha.');
    } finally { setBusy(false); }
  }

  async function updateEvidence(item: Evidence, status: Evidence['status']) {
    setBusy(true); setNotice(null); setError(null);
    try {
      await adminAccessRequest(`/api/v1/admin/delegated/operations/system/${item.key}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          summary: status === 'ok' ? 'Evidencia revisada manualmente desde operaciones.' : item.summary,
        }),
      });
      setNotice('Evidencia operativa actualizada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar la evidencia.');
    } finally { setBusy(false); }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><span className="admin-brand-mark">MO</span><span><strong>Mágina Olivo</strong><small>Operaciones delegadas</small></span></a>
        <nav aria-label="Operaciones delegadas">
          <a href="#directorio">Directorio</a>
          <a href="#fuentes">Fuentes</a>
          <a href="#sistema">Sistema</a>
          <a href="#auditoria">Auditoría</a>
          <a href="/admin">← Panel de trabajo</a>
        </nav>
        <div className="admin-sidebar-footer"><small>Permiso</small><span>Operaciones</span></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-eyebrow">Calidad y continuidad</p><h1>Operaciones</h1><p className="delegated-header-copy">Directorio público, fuentes y evidencias operativas. Sin acceso a usuarios ni datos agrícolas privados.</p></div>
          <button className="admin-ghost-button" type="button" onClick={() => void load()} disabled={busy}>Actualizar</button>
        </header>

        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section id="directorio" className="admin-section admin-command-section-first">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Información pública</p><h2>Directorio y cooperativas</h2><p>Las URLs deben ser HTTPS y cada modificación queda auditada.</p></div><span className="admin-count">{directory.length}</span></div>
          <div className="admin-two-column admin-ops-directory">
            <div className="admin-card admin-ops-list">
              {directory.map((item) => (
                <button key={item.id} type="button" className={item.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
                  <strong>{item.officialName}</strong><small>{item.brandName || item.municipality || 'Sin marca'}</small><span className={`admin-source-state ${item.verificationStatus}`}>{item.verificationStatus}</span>
                </button>
              ))}
            </div>
            {selected ? (
              <form key={selected.id} className="admin-card admin-form" onSubmit={saveDirectory}>
                <div className="admin-card-heading"><h3>Editar ficha</h3><span>{selected.municipality ?? 'Sierra Mágina'}</span></div>
                <label>Nombre oficial<input name="officialName" defaultValue={selected.officialName} required maxLength={240} /></label>
                <label>Marca<input name="brandName" defaultValue={selected.brandName ?? ''} maxLength={240} /></label>
                <div className="admin-form-row">
                  <label>Tipo<select name="entityType" defaultValue={selected.entityType}><option value="cooperative">Cooperativa</option><option value="sat">SAT</option><option value="company">Empresa</option><option value="other">Otro</option></select></label>
                  <label>Verificación<select name="verificationStatus" defaultValue={selected.verificationStatus}><option value="verified">Verificada</option><option value="unverified">Sin verificar</option><option value="stale">Revisión pendiente</option></select></label>
                </div>
                <div className="admin-form-row"><label>Municipio<input name="municipality" defaultValue={selected.municipality ?? ''} /></label><label>Provincia<input name="province" defaultValue={selected.province ?? ''} /></label></div>
                <label>Dirección<input name="address" defaultValue={selected.address ?? ''} /></label>
                <label>Teléfono<input name="phone" defaultValue={selected.phone ?? ''} /></label>
                <label>Web HTTPS<input name="websiteUrl" type="url" defaultValue={selected.websiteUrl ?? ''} /></label>
                <label>Fuente HTTPS<input name="sourceUrl" type="url" defaultValue={selected.sourceUrl ?? ''} /></label>
                <button className="admin-primary-button" type="submit" disabled={busy}>Guardar ficha</button>
              </form>
            ) : <div className="admin-card"><p className="admin-empty">Selecciona una ficha.</p></div>}
          </div>
        </section>

        <section id="fuentes" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Calidad del dato</p><h2>Fuentes</h2></div><span className="admin-count">{sources.length}</span></div>
          <div className="admin-source-grid">
            {sources.map((source) => (
              <article key={source.sourceKey} className="admin-card admin-source-card">
                <div><strong>{source.label}</strong><small>{source.provider}</small></div>
                <span className={`admin-source-state ${sourceTone(source)}`}>{source.lastError ? 'Revisar' : source.active ? 'Operativa' : 'Desactivada'}</span>
                <p>Comprobada: {shortDate(source.lastCheckedAt)}</p><p>Último éxito: {shortDate(source.lastSuccessAt)}</p>
                {source.lastError ? <p className="admin-source-error">{source.lastError}</p> : null}
                <small>{source.updateFrequency ?? 'Frecuencia no indicada'}</small>
              </article>
            ))}
          </div>
        </section>

        <section id="sistema" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Continuidad</p><h2>Evidencias operativas</h2><p>Solo se registra evidencia. No existe ejecución de restore desde el navegador.</p></div></div>
          <div className="admin-system-grid delegated-evidence-grid">
            {evidence.map((item) => (
              <article className="admin-card" key={item.key}>
                <span className={`admin-system-dot ${item.status === 'ok' ? '' : 'muted'}`} />
                <strong>{evidenceLabels[item.key]}</strong>
                <small>{item.status} · {shortDate(item.lastCheckedAt)}</small>
                <p>{item.summary ?? 'Sin resumen.'}</p>
                <div className="delegated-evidence-actions">
                  <button className="admin-table-action" disabled={busy} onClick={() => void updateEvidence(item, 'ok')}>Marcar OK</button>
                  <button className="admin-table-action" disabled={busy} onClick={() => void updateEvidence(item, 'warning')}>Revisar</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="auditoria" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Trazabilidad</p><h2>Actividad reciente</h2><p>La vista delegada no muestra correos de otros administradores.</p></div></div>
          <div className="admin-card admin-table-card"><div className="admin-table-wrap"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Entidad</th><th>Resumen</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td>{shortDate(item.occurredAt)}</td><td>{item.action}</td><td>{item.entityType}</td><td>{item.summary}</td></tr>)}</tbody></table></div></div>
        </section>

        <section className="delegated-admin-safety admin-card">
          <strong>Fuera de este permiso</strong>
          <p>Operaciones no puede ver la lista global de usuarios, cerrar sesiones, gestionar roles, publicar documentos legales ni ejecutar restauraciones.</p>
        </section>
      </main>
    </div>
  );
}
