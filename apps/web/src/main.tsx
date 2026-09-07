import { Component, lazy, StrictMode, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { installDemoPreview } from './demoPreview';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';
import { PrivateRoute } from './PrivateRoute';
import { PublicHomePage } from './PublicHomePage';
import { PublicNavigation } from './PublicNavigation';
import { currentReturnTo, safeReturnTo } from './private-access';
import { installWeatherDemoPreview } from './weatherDemoPreview';
import './styles.css';
import './brand.css';
import './connectivity.css';
import './navigation-v2.css';
import './notices.css';
import './field-notebook.css';
import './delivery-entry.css';
import './offline-cold-start.css';
import './magina-directory.css';
import './magina-weather.css';
import './weather-experience.css';
import './magina-hub.css';
import './magina-market.css';
import './magina-field-alerts.css';
import './local-services.css';
import './verified-services.css';
import './discover-territory.css';
import './discover-routes.css';
import './admin-preview.css';
import './integration-v2.css';
import './field-v2-integration.css';
import './journal-v2-integration.css';
import './campaign-v2-integration.css';
import './campaign-reference.css';
import './campaign-documents.css';
import './magina-private-hub.css';
import './offline-v2-integration.css';
import './auth-onboarding.css';
import './pilot-alerts.css';
import './calendar.css';
import './loyalty-olive.css';
import './reward-catalog.css';
import './reward-local-qr.css';
import './reward-validator.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import './visual-reference.css';

installDemoPreview();
installWeatherDemoPreview();

const AccountPage = lazy(async () => ({ default: (await import('./AccountPage')).AccountPage }));
const AdminDashboardPage = lazy(async () => ({ default: (await import('./AdminDashboardPage')).AdminDashboardPage }));
const AdminDashboardPreview = lazy(async () => ({ default: (await import('./AdminDashboardPreview')).AdminDashboardPreview }));
const App = lazy(async () => ({ default: (await import('./App')).App }));
const CalendarPage = lazy(async () => ({ default: (await import('./CalendarPage')).CalendarPage }));
const DiscoverCollectionPage = lazy(async () => ({ default: (await import('./DiscoverCollectionPage')).DiscoverCollectionPage }));
const DiscoverPage = lazy(async () => ({ default: (await import('./DiscoverPage')).DiscoverPage }));
const DiscoverRouteDetailPage = lazy(async () => ({ default: (await import('./DiscoverRoutesPage')).DiscoverRouteDetailPage }));
const DiscoverRoutesPage = lazy(async () => ({ default: (await import('./DiscoverRoutesPage')).DiscoverRoutesPage }));
const EditProfilePage = lazy(async () => ({ default: (await import('./EditProfilePage')).EditProfilePage }));
const HomePreferencesPage = lazy(async () => ({ default: (await import('./HomePreferencesPage')).HomePreferencesPage }));
const LoginPage = lazy(async () => ({ default: (await import('./LoginPage')).LoginPage }));
const LoyaltyOlivePage = lazy(async () => ({ default: (await import('./LoyaltyOlivePage')).LoyaltyOlivePage }));
const MaginaDirectoryPage = lazy(async () => ({ default: (await import('./MaginaDirectoryPage')).MaginaDirectoryPage }));
const MaginaFieldAlertsPage = lazy(async () => ({ default: (await import('./MaginaFieldAlertsPage')).MaginaFieldAlertsPage }));
const MaginaHubPage = lazy(async () => ({ default: (await import('./MaginaHubPage')).MaginaHubPage }));
const MaginaMarketPage = lazy(async () => ({ default: (await import('./MaginaMarketPage')).MaginaMarketPage }));
const MaginaNewsPage = lazy(async () => ({ default: (await import('./MaginaNewsPage')).MaginaNewsPage }));
const MaginaWeatherPage = lazy(async () => ({ default: (await import('./MaginaWeatherPage')).MaginaWeatherPage }));
const NotificationPreferencesPage = lazy(async () => ({ default: (await import('./NotificationPreferencesPage')).NotificationPreferencesPage }));
const OnboardingPage = lazy(async () => ({ default: (await import('./OnboardingPage')).OnboardingPage }));
const PrivacyPermissionsPage = lazy(async () => ({ default: (await import('./PrivacyPermissionsPage')).PrivacyPermissionsPage }));
const RegisterPage = lazy(async () => ({ default: (await import('./RegisterPage')).RegisterPage }));
const ResetPassword = lazy(async () => ({ default: (await import('./ResetPassword')).ResetPassword }));
const RewardCatalogPage = lazy(async () => ({ default: (await import('./RewardCatalogPage')).RewardCatalogPage }));
const RewardValidatorPage = lazy(async () => ({ default: (await import('./RewardValidatorPage')).RewardValidatorPage }));
const SupportPage = lazy(async () => ({ default: (await import('./SupportPage')).SupportPage }));
const VerifiedServicesPage = lazy(async () => ({ default: (await import('./VerifiedServicesPage')).VerifiedServicesPage }));
const WeatherAlertDetailPage = lazy(async () => ({ default: (await import('./WeatherExperiencePages')).WeatherAlertDetailPage }));
const WeatherAlertSettingsPage = lazy(async () => ({ default: (await import('./WeatherExperiencePages')).WeatherAlertSettingsPage }));
const WeatherHourlyPage = lazy(async () => ({ default: (await import('./WeatherExperiencePages')).WeatherHourlyPage }));
const WeatherWeeklyPage = lazy(async () => ({ default: (await import('./WeatherExperiencePages')).WeatherWeeklyPage }));

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const browserPath = window.location.pathname;
const pathWithoutBase = basePath && browserPath.startsWith(basePath)
  ? browserPath.slice(basePath.length) || '/'
  : browserPath;
const path = pathWithoutBase.startsWith('/') ? pathWithoutBase : `/${pathWithoutBase}`;
const returnTo = currentReturnTo();
const loginReturnTo = safeReturnTo(new URLSearchParams(window.location.search).get('next'));

function PublicScreen({ children, showAction = true }: { children: ReactNode; showAction?: boolean }) {
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><PublicNavigation activePath={path} showAction={showAction} />{children}</>;
}

function RouteLoading() {
  return <main className="route-loading" id="main-content" aria-live="polite"><span className="route-loading-mark" aria-hidden="true" /><p>Cargando Mágina Olivo…</p></main>;
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  async recover(): Promise<void> {
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      await Promise.all(registrations?.map((registration) => registration.update()) ?? []);
    } finally {
      window.location.reload();
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="route-recovery" id="main-content"><section className="card"><p className="eyebrow">Actualización necesaria</p><h1>Esta pantalla necesita recargarse</h1><p>La aplicación ha detectado una versión anterior. Actualízala para volver a cargar la información con seguridad.</p><div><button className="primary-button" type="button" onClick={() => void this.recover()}>Actualizar y reintentar</button><a className="secondary-button" href="/">Volver a Inicio</a></div></section></main>;
  }
}

if (basePath) {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const clicked = event.target;
    if (!(clicked instanceof Element)) return;
    const anchor = clicked.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== '_self') return;

    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith(`${basePath}/`)) return;

    event.preventDefault();
    window.location.assign(`${basePath}${href}`);
  });
}

createRoot(root).render(
  <StrictMode>
    <>
      <RouteErrorBoundary><Suspense fallback={<RouteLoading />}>
      {path === '/reset-password' ? (
        <ResetPassword />
      ) : path === '/login' ? (
        <LoginPage returnTo={loginReturnTo} />
      ) : path === '/register' ? (
        <RegisterPage />
      ) : path === '/onboarding' ? (
        <OnboardingPage />
      ) : path === '/admin' ? (
        import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1'
          ? <AdminDashboardPreview preview />
          : <PrivateRoute returnTo={returnTo}><AdminDashboardPage /></PrivateRoute>
      ) : path === '/cuenta' ? (
        <PrivateRoute returnTo={returnTo}><AccountPage /></PrivateRoute>
      ) : path === '/perfil/editar' ? (
        <PrivateRoute returnTo={returnTo}><EditProfilePage /></PrivateRoute>
      ) : path === '/perfil/notificaciones' ? (
        <PrivateRoute returnTo={returnTo}><NotificationPreferencesPage /></PrivateRoute>
      ) : path === '/perfil/privacidad' ? (
        <PrivateRoute returnTo={returnTo}><PrivacyPermissionsPage /></PrivateRoute>
      ) : path === '/perfil/preferencias' ? (
        <PrivateRoute returnTo={returnTo}><HomePreferencesPage /></PrivateRoute>
      ) : path === '/perfil/soporte' ? (
        <PrivateRoute returnTo={returnTo}><SupportPage /></PrivateRoute>
      ) : path === '/calendario' ? (
        <PrivateRoute returnTo={returnTo}><CalendarPage /></PrivateRoute>
      ) : path === '/tu-olivo' ? (
        <PrivateRoute returnTo={returnTo}><LoyaltyOlivePage /></PrivateRoute>
      ) : path === '/recompensas/validar' ? (
        <PrivateRoute returnTo={returnTo}><RewardValidatorPage /></PrivateRoute>
      ) : path === '/recompensas' ? (
        <PrivateRoute returnTo={returnTo}><RewardCatalogPage /></PrivateRoute>
      ) : path === '/mi-campo' ? (
        <App initialTab="field" />
      ) : path === '/campana' ? (
        <App initialTab="campaign" />
      ) : path === '/mi-magina' ? (
        <PublicScreen><MaginaHubPage /></PublicScreen>
      ) : path === '/descubre' ? (
        <PublicScreen showAction={false}><DiscoverPage /></PublicScreen>
      ) : path === '/descubre/rutas' ? (
        <PublicScreen showAction={false}><DiscoverRoutesPage /></PublicScreen>
      ) : path.startsWith('/descubre/rutas/') ? (
        <PublicScreen showAction={false}><DiscoverRouteDetailPage routeId={path.split('/').filter(Boolean).at(-1) ?? ''} /></PublicScreen>
      ) : ['/descubre/miradores', '/descubre/gastronomia', '/descubre/oleoturismo', '/descubre/pueblos'].includes(path) ? (
        <PublicScreen showAction={false}><DiscoverCollectionPage slug={path.split('/').filter(Boolean).at(-1) ?? ''} /></PublicScreen>
      ) : path === '/descubre/servicios' ? (
        <PublicScreen showAction={false}><VerifiedServicesPage /></PublicScreen>
      ) : path.startsWith('/descubre/servicios/') ? (
        <PublicScreen showAction={false}><VerifiedServicesPage /></PublicScreen>
      ) : path === '/descubre/sierra-magina' ? (
        <PublicScreen><DiscoverPage /></PublicScreen>
      ) : path === '/magina' ? (
        <PublicScreen><MaginaHubPage /></PublicScreen>
      ) : path === '/magina/directorio' ? (
        <PublicScreen><MaginaDirectoryPage /></PublicScreen>
      ) : path === '/magina/tiempo' ? (
        <WeatherWeeklyPage />
      ) : path === '/magina/tiempo/horas' ? (
        <WeatherHourlyPage />
      ) : path === '/magina/tiempo/radar' ? (
        <PublicScreen><MaginaWeatherPage /></PublicScreen>
      ) : path === '/magina/alerta' ? (
        <PrivateRoute returnTo={returnTo}><WeatherAlertDetailPage /></PrivateRoute>
      ) : path === '/magina/alertas/configurar' ? (
        <PrivateRoute returnTo={returnTo}><WeatherAlertSettingsPage /></PrivateRoute>
      ) : path === '/magina/campo' ? (
        <PublicScreen><MaginaFieldAlertsPage /></PublicScreen>
      ) : path === '/magina/noticias' ? (
        <PublicScreen><MaginaNewsPage /></PublicScreen>
      ) : path === '/magina/mercado' ? (
        <PublicScreen><MaginaMarketPage /></PublicScreen>
      ) : (
        <PublicScreen><PublicHomePage /></PublicScreen>
      )}
      </Suspense></RouteErrorBoundary>
      <PwaUpdatePrompt />
    </>
  </StrictMode>,
);
