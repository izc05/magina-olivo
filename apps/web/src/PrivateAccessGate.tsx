import { safeReturnTo } from './private-access';

export function PrivateAccessGate({ returnTo }: { returnTo: string }) {
  const destination = safeReturnTo(returnTo);
  const encodedDestination = encodeURIComponent(destination);

  return (
    <main className="access-gate-shell" id="main-content">
      <section className="access-gate-card" aria-labelledby="access-gate-title">
        <img className="access-gate-mark" src="/brand/magina-olivo-mark.svg" alt="" />
        <p className="eyebrow">Área privada</p>
        <h1 id="access-gate-title">Gestiona tu olivar desde un solo lugar</h1>
        <p>Inicia sesión o crea una cuenta para gestionar tu olivar.</p>
        <div className="access-gate-actions">
          <a className="primary-button" href={`/login?next=${encodedDestination}`}>Iniciar sesión</a>
          <a className="secondary-button" href="/register">Crear cuenta</a>
        </div>
        <a className="text-button" href="/">Seguir explorando Mágina</a>
      </section>
    </main>
  );
}
