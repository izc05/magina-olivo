import { safeReturnTo } from './private-access';

type PrivateArea = 'account' | 'field';

export function PrivateAccessGate({ returnTo, area = 'account' }: { returnTo: string; area?: PrivateArea }) {
  const destination = safeReturnTo(returnTo);
  const encodedDestination = encodeURIComponent(destination);
  const isField = area === 'field';

  return (
    <main className="access-gate-shell" id="main-content">
      <section className="access-gate-card" aria-labelledby="access-gate-title">
        <img className="access-gate-mark" src="/brand/magina-olivo-official-mark.png" alt="" />
        <p className="eyebrow">{isField ? 'MI CAMPO · ÁREA PRIVADA' : 'ÁREA PRIVADA'}</p>
        <h1 id="access-gate-title">{isField ? 'Tu olivar, protegido y siempre a mano' : 'Accede a tu cuenta de Mágina Olivo'}</h1>
        <p>{isField ? 'Puedes recorrer toda Mágina sin cuenta. Inicia sesión solo para consultar o gestionar tus fincas, parcelas, tareas, alertas y campaña.' : 'Inicia sesión o crea una cuenta para consultar y gestionar tu información personal.'}</p>
        <div className="access-gate-actions">
          <a className="primary-button" href={`/login?next=${encodedDestination}`}>Iniciar sesión</a>
          <a className="secondary-button" href="/register">Crear cuenta</a>
        </div>
        <a className="text-button" href="/">Seguir explorando Mágina</a>
      </section>
    </main>
  );
}
