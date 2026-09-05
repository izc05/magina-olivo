import type { Holding, User } from './api';
import './more-dashboard-v2.css';

export function MoreDashboardV2({
  user,
  holding,
  busy,
  onSignOut,
}: {
  user: User;
  holding: Holding | null;
  busy: boolean;
  onSignOut: () => void;
}) {
  const initials = (user.name || user.email || 'MO')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'MO';

  return (
    <div className="more-v2">
      <section className="more-v2-hero">
        <div className="more-v2-avatar" aria-hidden="true">{initials}</div>
        <div className="more-v2-hero__copy">
          <span>MI MÁGINA</span>
          <h1>{user.name || 'Agricultor'}</h1>
          <p>{user.email}</p>
          {holding ? <small>{holding.name}{holding.municipality ? ` · ${holding.municipality}` : ''}</small> : <small>Configura tu explotación para completar tu espacio.</small>}
        </div>
      </section>

      <section className="more-v2-section" aria-labelledby="more-space-title">
        <div className="more-v2-heading">
          <div><span>TU ESPACIO</span><h2 id="more-space-title">Cuenta y organización</h2></div>
        </div>
        <div className="more-v2-grid">
          <a href="/cuenta" className="more-v2-card">
            <span className="more-v2-card__icon" aria-hidden="true">◎</span>
            <strong>Mi cuenta</strong>
            <small>Preferencias, avisos, cooperativa habitual y privacidad.</small>
            <em>Configurar →</em>
          </a>
          <a href="/calendario" className="more-v2-card">
            <span className="more-v2-card__icon" aria-hidden="true">□</span>
            <strong>Tareas</strong>
            <small>Calendario agrícola, vencimientos y recordatorios.</small>
            <em>Abrir →</em>
          </a>
          <a href="/magina" className="more-v2-card">
            <span className="more-v2-card__icon" aria-hidden="true">◇</span>
            <strong>Sierra Mágina</strong>
            <small>Tiempo, alertas, mercado, noticias y directorio.</small>
            <em>Explorar →</em>
          </a>
          <a href="/" className="more-v2-card">
            <span className="more-v2-card__icon" aria-hidden="true">⌂</span>
            <strong>Inicio</strong>
            <small>Vuelve al resumen de tu olivar y campaña activa.</small>
            <em>Volver →</em>
          </a>
        </div>
      </section>

      <section className="more-v2-privacy" aria-labelledby="more-privacy-title">
        <div className="more-v2-privacy__mark" aria-hidden="true">✓</div>
        <div>
          <span>DATOS PRIVADOS</span>
          <h2 id="more-privacy-title">Tu explotación sigue siendo tuya</h2>
          <p>Las preferencias de cooperativa no comparten entregas ni documentos. Desde Mi cuenta puedes preparar una copia estructurada de tus datos y revisar los avisos que quieres recibir.</p>
          <a href="/cuenta">Privacidad y copia de datos →</a>
        </div>
      </section>

      <section className="more-v2-session">
        <div>
          <strong>Sesión</strong>
          <small>Antes de salir, Mágina Olivo comprobará que no queden cambios offline pendientes.</small>
        </div>
        <button className="ghost-button danger-button" type="button" onClick={onSignOut} disabled={busy}>{busy ? 'Saliendo…' : 'Cerrar sesión'}</button>
      </section>
    </div>
  );
}
