import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountPage } from './AccountPage';
import { App } from './App';
import { CalendarPage } from './CalendarPage';
import { installDemoPreview } from './demoPreview';
import { DiscoverPage } from './DiscoverPage';
import { LoginPage } from './LoginPage';
import { MaginaDirectoryPage } from './MaginaDirectoryPage';
import { MaginaFieldAlertsPage } from './MaginaFieldAlertsPage';
import { MaginaHubPage } from './MaginaHubPage';
import { MaginaMarketPage } from './MaginaMarketPage';
import { MaginaNewsPage } from './MaginaNewsPage';
import { MaginaWeatherPage } from './MaginaWeatherPage';
import { OnboardingPage } from './OnboardingPage';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';
import { PrivateRoute } from './PrivateRoute';
import { PublicHomePage } from './PublicHomePage';
import { PublicNavigation } from './PublicNavigation';
import { RegisterPage } from './RegisterPage';
import { ResetPassword } from './ResetPassword';
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
import './magina-hub.css';
import './magina-market.css';
import './magina-field-alerts.css';
import './integration-v2.css';
import './field-v2-integration.css';
import './journal-v2-integration.css';
import './campaign-v2-integration.css';
import './campaign-documents.css';
import './magina-private-hub.css';
import './offline-v2-integration.css';
import './auth-onboarding.css';
import './pilot-alerts.css';
import './calendar.css';

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
      ) : path === '/calendario' ? (
        <PrivateRoute returnTo={returnTo}><CalendarPage /></PrivateRoute>
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
        <PublicScreen><MaginaWeatherPage /></PublicScreen>
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
