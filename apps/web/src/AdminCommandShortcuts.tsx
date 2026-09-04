export function AdminCommandShortcuts() {
  return (
    <nav className="admin-command-shortcuts" aria-label="Nuevas áreas administrativas">
      <a href="/admin/comercial"><span>↗</span><strong>Embudo comercial</strong><small>Solicitudes · campañas · conversión</small></a>
      <a href="/admin/anunciantes"><span>◎</span><strong>Anunciantes</strong><small>Accesos · roles · cambios de ficha</small></a>
      <a href="/admin/estadisticas"><span>▥</span><strong>Estadísticas</strong><small>Rendimiento · Destacado vs Premium</small></a>
      <a href="/admin/finanzas"><span>€</span><strong>Economía</strong><small>Tarifas · cobros · renovaciones</small></a>
      <a href="/admin/roles"><span>◉</span><strong>Roles</strong><small>Delegación de permisos</small></a>
    </nav>
  );
}
