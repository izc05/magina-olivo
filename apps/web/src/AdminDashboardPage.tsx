import { useEffect, useState } from 'react';
import { Activity, Bell, Building2, ChartNoAxesCombined, Crown, Database, Leaf, MapPinned, Sprout, Users } from 'lucide-react';
import { VisualHeader } from './VisualChrome';

type AdminRole = 'super_admin' | 'admin' | 'editor' | 'support';
type Overview = {
  role: AdminRole;
  generatedAt: string;
  metrics: {
    users: number;
    holdings: number;
    activeFarms: number;
    activePlots: number;
    publicCooperatives: number;
    activeCampaigns: number;
  };
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message === 'HTTP 403') {
    return 'Tu cuenta ha iniciado sesión, pero todavía no tiene permiso de administración de plataforma.';
  }
  return 'No se ha podido cargar el panel ahora. Tus datos de Mi Campo siguen protegidos y no se han modificado.';
}

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readJson<Overview>('/api/v1/admin/overview')
      .then((result) => { if (!cancelled) setOverview(result); })
      .catch((reason) => { if (!cancelled) setError(errorMessage(reason)); });
    return () => { cancelled = true; };
  }, []);

  if (!overview) {
    if (!error) return <main className="admin-access-gate" role="status">Comprobando acceso de administración…</main>;
    return <main className="admin-access-gate" id="main-content"><VisualHeader /><section className="admin-access-card card"><span className="admin-icon"><Crown aria-hidden="true" /></span><p className="eyebrow">Administración interna</p><h1>Acceso restringido</h1><p>{error}</p><a className="primary-button" href="/cuenta">Volver a tu perfil</a></section></main>;
  }

  const metrics = [
    { label: 'Usuarios registrados', value: overview.metrics.users, detail: 'cuentas de plataforma', icon: Users },
    { label: 'Explotaciones', value: overview.metrics.holdings, detail: 'registros privados', icon: MapPinned },
    { label: 'Fincas activas', value: overview.metrics.activeFarms, detail: 'en Mi Campo', icon: Sprout },
    { label: 'Parcelas activas', value: overview.metrics.activePlots, detail: 'en seguimiento', icon: Leaf },
    { label: 'Cooperativas públicas', value: overview.metrics.publicCooperatives, detail: 'fichas vigentes', icon: Building2 },
    { label: 'Campañas activas', value: overview.metrics.activeCampaigns, detail: 'agregado de plataforma', icon: ChartNoAxesCombined },
  ];

  return <main className="admin-preview" id="main-content">
    <VisualHeader><div className="admin-preview-header-actions"><span><Crown aria-hidden="true" /> {overview.role === 'super_admin' ? 'Superadministradora' : 'Administración'}</span><button type="button" aria-label="Notificaciones de administración" disabled><Bell aria-hidden="true" /></button><b aria-label="Cuenta administradora">AD</b></div></VisualHeader>
    <section className="admin-preview-hero" aria-labelledby="admin-dashboard-title"><div><p className="eyebrow">Panel de administración</p><h1 id="admin-dashboard-title">Mágina Olivo, bajo control</h1><p>Resumen agregado de plataforma. Este panel no abre documentos ni datos productivos de agricultores.</p></div><span><MapPinned aria-hidden="true" /> Sierra Mágina<small>Consola interna</small></span></section>
    <section className="admin-preview-heading" aria-labelledby="admin-section-title"><div><p className="eyebrow">Administración · resumen</p><h2 id="admin-section-title">Visión general</h2><p>Actualizado {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(overview.generatedAt))}</p></div></section>
    <section className="admin-preview-metrics" aria-label="Métricas agregadas de plataforma">{metrics.map(({ label, value, detail, icon: Icon }) => <article className="admin-metric-card" key={label}><span className="admin-icon"><Icon aria-hidden="true" /></span><div><small>{label}</small><strong>{formatMetric(value)}</strong><em>{detail}</em></div></article>)}</section>
    <section className="admin-preview-grid">
      <article className="admin-panel card" aria-labelledby="admin-scope-title"><header><span><Activity aria-hidden="true" /><h2 id="admin-scope-title">Alcance actual</h2></span></header><ul><li><span className="admin-icon"><Database aria-hidden="true" /></span><div><strong>Solo métricas agregadas</strong><small>Sin listado de personas, ubicaciones ni documentos privados.</small></div></li><li><span className="admin-icon"><Crown aria-hidden="true" /></span><div><strong>Permiso separado</strong><small>El rol de plataforma no sustituye los permisos de cada explotación.</small></div></li></ul></article>
      <article className="admin-panel card" aria-labelledby="admin-next-title"><header><span><Building2 aria-hidden="true" /><h2 id="admin-next-title">Siguientes módulos</h2></span></header><ul><li><span className="admin-icon"><Building2 aria-hidden="true" /></span><div><strong>Cooperativas</strong><small>Edición pública con validación y auditoría.</small></div></li><li><span className="admin-icon"><Activity aria-hidden="true" /></span><div><strong>Contenido y avisos</strong><small>Publicación controlada, sin acceso transversal a Mi Campo.</small></div></li></ul></article>
    </section>
  </main>;
}
