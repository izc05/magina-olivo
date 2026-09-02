import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CloudOff,
  FilePlus2,
  KeyRound,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  RotateCcw,
  ShieldCheck,
  Sprout,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';
import { Brand } from '../../components/Brand';
import '../../styles/technical.css';

type TechnicalStatesPageProps = {
  onBack: () => void;
};

type TechnicalState = 'login' | 'register' | 'recover' | 'onboarding' | 'permissions' | 'loading' | 'offline' | 'empty' | 'error' | 'success';

const labels: Array<{ id: TechnicalState; label: string }> = [
  { id: 'login', label: 'Acceso' },
  { id: 'register', label: 'Registro' },
  { id: 'recover', label: 'Recuperar' },
  { id: 'onboarding', label: 'Inicio' },
  { id: 'permissions', label: 'Permisos' },
  { id: 'loading', label: 'Cargando' },
  { id: 'offline', label: 'Sin conexión' },
  { id: 'empty', label: 'Sin datos' },
  { id: 'error', label: 'Error' },
  { id: 'success', label: 'Confirmación' },
];

export function TechnicalStatesPage({ onBack }: TechnicalStatesPageProps) {
  const [state, setState] = useState<TechnicalState>('login');

  const stopSubmit = (event: FormEvent) => event.preventDefault();

  return (
    <div className="technical-shell">
      <main className="technical-page">
        <header className="technical-topbar">
          <button className="icon-button" type="button" aria-label="Volver" onClick={onBack}><ArrowLeft size={20} /></button>
          <Brand />
          <span className="technical-v2-badge">V2</span>
        </header>

        <nav className="technical-state-tabs" aria-label="Estados técnicos V2">
          {labels.map(({ id, label }) => (
            <button key={id} type="button" className={state === id ? 'technical-state-tab technical-state-tab--active' : 'technical-state-tab'} onClick={() => setState(id)}>{label}</button>
          ))}
        </nav>

        {state === 'login' && (
          <section className="technical-card technical-auth-card">
            <div className="technical-icon technical-icon--brand"><KeyRound size={27} /></div>
            <span className="eyebrow">Mágina Olivo</span>
            <h1>Bienvenido de nuevo</h1>
            <p>Accede a tu finca, cuaderno, campaña y toda la información de Sierra Mágina.</p>
            <form className="technical-form" onSubmit={stopSubmit}>
              <label><span>Correo electrónico</span><input type="email" placeholder="tu@correo.es" /></label>
              <label><span>Contraseña</span><input type="password" placeholder="••••••••" /></label>
              <button className="technical-primary-button" type="submit">Entrar</button>
            </form>
            <div className="technical-auth-links"><button type="button" onClick={() => setState('recover')}>He olvidado mi contraseña</button><button type="button" onClick={() => setState('register')}>Crear cuenta</button></div>
          </section>
        )}

        {state === 'register' && (
          <section className="technical-card technical-auth-card">
            <div className="technical-icon technical-icon--brand"><UserPlus size={27} /></div>
            <span className="eyebrow">Nueva cuenta</span>
            <h1>Empieza con tu olivar</h1>
            <p>Solo pediremos los datos necesarios. La finca y las parcelas se configuran después.</p>
            <form className="technical-form" onSubmit={stopSubmit}>
              <label><span>Nombre</span><input type="text" placeholder="Tu nombre" /></label>
              <label><span>Municipio</span><select defaultValue="Bedmar"><option>Bedmar</option><option>Huelma</option><option>Jimena</option><option>Cambil</option></select></label>
              <label><span>Correo electrónico</span><input type="email" placeholder="tu@correo.es" /></label>
              <button className="technical-primary-button" type="submit" onClick={() => setState('onboarding')}>Continuar</button>
            </form>
          </section>
        )}

        {state === 'recover' && (
          <section className="technical-card technical-auth-card">
            <div className="technical-icon"><KeyRound size={27} /></div>
            <span className="eyebrow">Recuperación</span>
            <h1>Recupera tu acceso</h1>
            <p>Introduce tu correo y enviaremos las instrucciones para crear una nueva contraseña.</p>
            <form className="technical-form" onSubmit={stopSubmit}>
              <label><span>Correo electrónico</span><input type="email" placeholder="tu@correo.es" /></label>
              <button className="technical-primary-button" type="submit">Enviar enlace</button>
            </form>
            <button className="technical-text-button" type="button" onClick={() => setState('login')}>Volver al acceso</button>
          </section>
        )}

        {state === 'onboarding' && (
          <section className="technical-card technical-onboarding-card">
            <div className="technical-step-row"><span>Paso 1 de 3</span><strong>Tu primera finca</strong></div>
            <div className="technical-progress"><span /></div>
            <div className="technical-icon"><Sprout size={28} /></div>
            <h1>Cuéntanos lo esencial</h1>
            <p>Esto personaliza la experiencia desde el primer día.</p>
            <form className="technical-form technical-form--grid" onSubmit={stopSubmit}>
              <label><span>Nombre de la finca</span><input type="text" defaultValue="Los Llanos" /></label>
              <label><span>Municipio</span><input type="text" defaultValue="Bedmar" /></label>
              <label><span>Superficie</span><input type="text" defaultValue="23,45 ha" /></label>
              <label><span>Variedad principal</span><select defaultValue="Picual"><option>Picual</option><option>Hojiblanca</option><option>Arbequina</option></select></label>
              <button className="technical-primary-button technical-primary-button--full" type="submit" onClick={() => setState('permissions')}>Guardar y continuar</button>
            </form>
          </section>
        )}

        {state === 'permissions' && (
          <section className="technical-card technical-centered-card">
            <div className="technical-icon technical-icon--large"><LocateFixed size={34} /></div>
            <span className="eyebrow">Ubicación</span>
            <h1>Información más útil para tu zona</h1>
            <p>La ubicación permite ajustar meteorología, servicios cercanos y contenido local. Siempre podrás cambiar este permiso desde Ajustes.</p>
            <div className="technical-benefit-list">
              <span><Check size={16} />Tiempo más preciso por finca</span>
              <span><Check size={16} />Cooperativas y servicios cercanos</span>
              <span><Check size={16} />Rutas y contenido de tu comarca</span>
            </div>
            <button className="technical-primary-button" type="button">Permitir ubicación</button>
            <button className="technical-text-button" type="button">Ahora no</button>
          </section>
        )}

        {state === 'loading' && (
          <section className="technical-card technical-centered-card technical-state-card">
            <div className="technical-loader"><LoaderCircle size={36} /></div>
            <h1>Actualizando tu campo</h1>
            <p>Sincronizando finca, tareas, alertas y última información disponible.</p>
            <div className="technical-skeleton"><span /><span /><span /></div>
          </section>
        )}

        {state === 'offline' && (
          <section className="technical-card technical-centered-card technical-state-card">
            <div className="technical-icon technical-icon--large"><CloudOff size={34} /></div>
            <span className="eyebrow">Modo sin conexión</span>
            <h1>Puedes seguir trabajando</h1>
            <p>Consulta los datos guardados y registra labores. Los cambios pendientes se sincronizarán cuando vuelva la conexión.</p>
            <div className="technical-benefit-list technical-benefit-list--left">
              <span><Check size={16} />Fincas y parcelas guardadas</span>
              <span><Check size={16} />Cuaderno de campo</span>
              <span><Check size={16} />Tareas pendientes</span>
            </div>
            <button className="technical-primary-button" type="button"><RotateCcw size={17} />Reintentar conexión</button>
          </section>
        )}

        {state === 'empty' && (
          <section className="technical-card technical-centered-card technical-state-card">
            <div className="technical-icon technical-icon--large"><MapPinned size={34} /></div>
            <span className="eyebrow">Mi Campo</span>
            <h1>Aún no hay parcelas</h1>
            <p>Añade la primera para empezar a registrar labores, campaña, fotos y avisos específicos.</p>
            <button className="technical-primary-button" type="button"><FilePlus2 size={17} />Añadir primera parcela</button>
          </section>
        )}

        {state === 'error' && (
          <section className="technical-card technical-centered-card technical-state-card">
            <div className="technical-icon technical-icon--large technical-icon--warning"><TriangleAlert size={34} /></div>
            <span className="eyebrow">Carga interrumpida</span>
            <h1>No hemos podido mostrar esta información</h1>
            <p>Puede ser un problema temporal de conexión o de la fuente consultada. Los datos guardados permanecen disponibles.</p>
            <button className="technical-primary-button" type="button"><RotateCcw size={17} />Reintentar</button>
            <button className="technical-text-button" type="button">Volver</button>
          </section>
        )}

        {state === 'success' && (
          <section className="technical-card technical-centered-card technical-state-card">
            <div className="technical-icon technical-icon--large technical-icon--success"><Check size={36} /></div>
            <span className="eyebrow">Cuaderno de campo</span>
            <h1>Tratamiento guardado</h1>
            <p>La anotación se ha añadido a Parcela 3 y queda preparada para sincronizarse con el resto de la información de la finca.</p>
            <div className="technical-summary-list"><div><span>Fecha</span><strong>2 septiembre 2026</strong></div><div><span>Parcela</span><strong>Parcela 3</strong></div><div><span>Tipo</span><strong>Tratamiento</strong></div></div>
            <button className="technical-primary-button" type="button"><ShieldCheck size={17} />Ver anotación</button>
          </section>
        )}
      </main>
    </div>
  );
}
