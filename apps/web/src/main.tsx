import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AccountPage } from './AccountPage';
import { AdminAdvertisingPage } from './AdminAdvertisingPage';
import { App } from './App';
import { CalendarPage } from './CalendarPage';
import { ConnectivityStatus } from './ConnectivityStatus';
import { installDemoPreview } from './demoPreview';
import { MaginaDirectoryPage } from './MaginaDirectoryPage';
import { MaginaFieldAlertsPage } from './MaginaFieldAlertsPage';
import { MaginaHubPage } from './MaginaHubPage';
import { MaginaMarketPage } from './MaginaMarketPage';
import { MaginaNewsPage } from './MaginaNewsPage';
import { MaginaWeatherPage } from './MaginaWeatherPage';
import { NoticeCenter } from './NoticeCenter';
import { OnboardingPage } from './OnboardingPage';
import { PilotAlerts } from './PilotAlerts';
import { RegisterPage } from './RegisterPage';
import { RegistrationEntry } from './RegistrationEntry';
import { ResetPassword } from './ResetPassword';
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
import './admin-advertising.css';

installDemoPreview();
installWeatherDemoPreview();

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('Mágina Olivo app shell is available offline.');
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const browserPath = window.location.pathname;
const pathWithoutBase = basePath && browserPath.startsWith(basePath)
  ? browserPath.slice(basePath.length) || '/'
  : browserPath;
const path = pathWithoutBase.startsWith('/') ? pathWithoutBase : `/${pathWithoutBase}`;

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
    {path === '/reset-password' ? (
      <ResetPassword />
    ) : path === '/register' ? (
      <RegisterPage />
    ) : path === '/onboarding' ? (
      <OnboardingPage />
    ) : path === '/cuenta' ? (
      <AccountPage />
    ) : path === '/calendario' ? (
      <CalendarPage />
    ) : path === '/admin/publicidad' ? (
      <AdminAdvertisingPage />
    ) : path === '/magina' ? (
      <MaginaHubPage />
    ) : path === '/magina/directorio' ? (
      <MaginaDirectoryPage />
    ) : path === '/magina/tiempo' ? (
      <MaginaWeatherPage />
    ) : path === '/magina/campo' ? (
      <MaginaFieldAlertsPage />
    ) : path === '/magina/noticias' ? (
      <MaginaNewsPage />
    ) : path === '/magina/mercado' ? (
      <MaginaMarketPage />
    ) : (
      <>
        <ConnectivityStatus />
        <NoticeCenter />
        <PilotAlerts />
        <RegistrationEntry />
        <App />
      </>
    )}
  </StrictMode>,
);