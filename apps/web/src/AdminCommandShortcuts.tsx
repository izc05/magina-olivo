export function AdminCommandShortcuts() {
  return (
    <nav className="admin-command-shortcuts" aria-label="Nuevas áreas administrativas">
      <a href="/admin/finanzas"><span>€</span><strong>Economía</strong><small>Tarifas · cobros · renovaciones</small></a>
      <a href="/admin/roles"><span>◉</span><strong>Roles</strong><small>Delegación de permisos</small></a>
    </nav>
  );
}
