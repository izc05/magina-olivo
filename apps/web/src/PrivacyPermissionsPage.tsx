import { Bell, Camera, CheckCircle2, Database, MapPin, Settings, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PublicNavigation } from './PublicNavigation';
import { VisualHeader } from './VisualChrome';

type PermissionStateLabel = 'Permitido' | 'Pendiente' | 'Bloqueado' | 'Disponible';

function labelFor(state: PermissionState | NotificationPermission): PermissionStateLabel {
  if (state === 'granted') return 'Permitido';
  if (state === 'denied') return 'Bloqueado';
  return 'Pendiente';
}

export function PrivacyPermissionsPage() {
  const [location, setLocation] = useState<PermissionStateLabel>('Pendiente');
  const [camera, setCamera] = useState<PermissionStateLabel>('Pendiente');
  const [notifications, setNotifications] = useState<PermissionStateLabel>(() => typeof Notification === 'undefined' ? 'Bloqueado' : labelFor(Notification.permission));
  const storage: PermissionStateLabel = 'caches' in window && 'serviceWorker' in navigator ? 'Disponible' : 'Bloqueado';
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.permissions) return;
    void navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      const sync = () => setLocation(labelFor(status.state));
      sync(); status.addEventListener('change', sync);
    }).catch(() => undefined);
    void navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
      const sync = () => setCamera(labelFor(status.state));
      sync(); status.addEventListener('change', sync);
    }).catch(() => undefined);
  }, []);

  function askLocation() {
    if (!navigator.geolocation) return setMessage('La ubicación no está disponible en este navegador.');
    navigator.geolocation.getCurrentPosition(() => setLocation('Permitido'), (error) => {
      setLocation(error.code === error.PERMISSION_DENIED ? 'Bloqueado' : 'Pendiente');
      setMessage('Puedes cambiar este permiso desde los ajustes del navegador.');
    }, { maximumAge: 60_000, timeout: 8_000 });
  }

  async function askNotifications() {
    if (typeof Notification === 'undefined') return setMessage('Las notificaciones no están disponibles en este navegador.');
    const result = await Notification.requestPermission();
    setNotifications(labelFor(result));
  }

  async function askCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return setMessage('La cámara no está disponible en este navegador.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCamera('Permitido');
    } catch (reason) {
      setCamera(reason instanceof DOMException && reason.name === 'NotAllowedError' ? 'Bloqueado' : 'Pendiente');
      setMessage('No se ha abierto la cámara. Revisa el permiso del navegador.');
    }
  }

  const rows = [
    { icon: MapPin, title: 'Ubicación', copy: 'Se usa para mostrar tu zona y ofrecer previsiones municipales.', status: location, action: askLocation },
    { icon: Bell, title: 'Notificaciones del sistema', copy: 'Permite mostrar avisos importantes cuando actives el servicio.', status: notifications, action: () => void askNotifications() },
    { icon: Camera, title: 'Cámara y fotos', copy: 'Necesaria para adjuntar imágenes cuando habilitemos su almacenamiento privado.', status: camera, action: () => void askCamera() },
    { icon: Database, title: 'Almacenamiento offline', copy: 'Permite trabajar con datos locales cuando pierdes la conexión.', status: storage },
    { icon: ShieldCheck, title: 'Consentimiento y datos', copy: 'Consulta o descarga la información asociada a tu cuenta.', status: 'Disponible' as const, href: '/cuenta#privacidad' },
  ];

  return <main className="account-shell privacy-permissions-shell">
    <VisualHeader />
    <PublicNavigation activePath="/cuenta" />
    <div className="account-page">
      <a className="profile-back-link" href="/cuenta">← Perfil</a>
      <section><p className="eyebrow page-eyebrow">MI PERFIL</p><h1 className="section-title">Privacidad y permisos</h1><p className="section-copy">Gestiona el acceso de la aplicación a funciones de tu dispositivo y a tus datos.</p></section>
      {message ? <div className="alert section" role="status">{message}</div> : null}
      <section className="section privacy-permission-list" aria-label="Permisos de la aplicación">
        {rows.map(({ icon: Icon, title, copy, status, action, href }) => {
          const content = <><span className="profile-link-icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{copy}</small></span><span className={`permission-status ${status === 'Permitido' || status === 'Disponible' ? 'is-allowed' : status === 'Bloqueado' ? 'is-blocked' : ''}`}>{status === 'Permitido' || status === 'Disponible' ? <CheckCircle2 aria-hidden="true" /> : <Settings aria-hidden="true" />}{status}</span></>;
          return href ? <a className="card privacy-permission-row" href={href} key={title}>{content}</a> : <button className="card privacy-permission-row" type="button" onClick={action} disabled={!action} key={title}>{content}</button>;
        })}
      </section>
      <section className="section privacy-note"><ShieldCheck aria-hidden="true" /><span><strong>Tu privacidad es importante</strong><small>Los permisos se solicitan solo cuando pulsas una opción. Puedes revocarlos después desde los ajustes de tu navegador.</small></span></section>
    </div>
  </main>;
}
