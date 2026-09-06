import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountPage } from './AccountPage';
import { App } from './App';
import { CalendarPage } from './CalendarPage';
import { installDemoPreview } from './demoPreview';
import { DiscoverPage } from './DiscoverPage';
import { EditProfilePage } from './EditProfilePage';
import { HomePreferencesPage } from './HomePreferencesPage';
import { LoginPage } from './LoginPage';
import { LoyaltyOlivePage } from './LoyaltyOlivePage';
import { MaginaDirectoryPage } from './MaginaDirectoryPage';
import { MaginaFieldAlertsPage } from './MaginaFieldAlertsPage';
import { MaginaHubPage } from './MaginaHubPage';
import { MaginaMarketPage } from './MaginaMarketPage';
import { MaginaWeatherPage } from './MaginaWeatherPage';
import { MaginaNewsPage } from './MaginaNewsPage';
import { WeatherAlertDetailPage, WeatherAlertSettingsPage, WeatherHourlyPage, WeatherWeeklyPage } from './WeatherExperiencePages';
import { NotificationPreferencesPage } from './NotificationPreferencesPage';
import { OnboardingPage } from './OnboardingPage';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';
import { PrivateRoute } from './PrivateRoute';
import { PrivacyPermissionsPage } from './PrivacyPermissionsPage';
import { PublicHomePage } from './PublicHomePage';
import { PublicNavigation } from './PublicNavigation';
import { RegisterPage } from './RegisterPage';
import { ResetPassword } from './ResetPassword';
import { currentReturnTo, safeReturnTo } from './private-access';
import { RewardCatalogPage } from './RewardCatalogPage';
import { RewardValidatorPage } from './RewardValidatorPage';
import { SupportPage } from './SupportPage';
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

function PublicScreen({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><PublicNavigation activePath={path} />{children}</>;
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
      {path === '/reset-password' ? (
        <ResetPassword />
      ) : path === '/login' ? (
        <LoginPage returnTo={loginReturnTo} />
      ) : path === '/register' ? (
        <RegisterPage />
      ) : path === '/onboarding' ? (
        <OnboardingPage />
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
        <App initialTab="more" />
      ) : path === '/descubre' ? (
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
      <PwaUpdatePrompt />
    </>
  </StrictMode>,
);
