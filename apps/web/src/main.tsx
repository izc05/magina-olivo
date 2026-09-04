import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AccountPage } from './AccountPage';
import { AdminCommandCenterPage } from './AdminCommandCenterPage';
import { AdminCommandShortcuts } from './AdminCommandShortcuts';
import { AdminContentPage } from './AdminContentPage';
import { AdminFinancePage } from './AdminFinancePage';
import { AdminOperationsPage } from './AdminOperationsPage';
import { AdminPage } from './AdminPage';
import { AdminRolesPage } from './AdminRolesPage';
import { AdminSupportSystemPage } from './AdminSupportSystemPage';
import { App } from './App';
import { CalendarPage } from './CalendarPage';
import { ConnectivityStatus } from './ConnectivityStatus';
import { ContactPage } from './ContactPage';
import { installDemoPreview } from './demoPreview';
import { LegalPage } from './LegalPage';
import { MaginaDirectoryPage } from './MaginaDirectoryPage';
import { MaginaFieldAlertsPage } from './MaginaFieldAlertsPage';
import { MaginaHubPage } from './MaginaHubPage';
import { MaginaMarketPage } from './MaginaMarketPage';
import { MaginaNewsPage } from './MaginaNewsPage';
import { MaginaWeatherPage } from './MaginaWeatherPage';
import { NoticeCenter } from './NoticeCenter';
import { OnboardingPage } from './OnboardingPage';
import { PilotAlerts } from './PilotAlerts';
import { PlatformAnnouncements } from './PlatformAnnouncements';
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
import './admin.css';
import './admin-operations.css';
import './admin-content.css';
import './admin-finance-roles.css';
import './admin-command-shortcuts.css';
import './platform-announcements.css';
import './support-legal-system.css';

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
    <>
      {!path.startsWith('/admin') ? <PlatformAnnouncements /> : null}
      {path === '/reset-password' ? (
        <ResetPassword />
      ) : path === '/register' ? (
        <RegisterPage />
      ) : path === '/onboarding' ? (
        <OnboardingPage />
      ) : path === '/admin/soporte' ? (
        <AdminSupportSystemPage />
      ) : path === '/admin/contenido' ? (
        <AdminContentPage />
      ) : path === '/admin/operaciones' ? (
        <AdminOperationsPage />
      ) : path === '/admin/finanzas' ? (
        <AdminFinancePage />
      ) : path === '/admin/roles' ? (
        <AdminRolesPage />
      ) : path === '/admin/publicidad' ? (
        <>
          <AdminPage />
          <a className="admin-ops-entry" href="/admin">← Centro de mando</a>
        </>
      ) : path === '/admin' ? (
        <>
          <AdminCommandCenterPage />
          <AdminCommandShortcuts />
        </>
      ) : path === '/contacto' ? (
        <ContactPage />
      ) : path === '/legal/privacidad' ? (
        <LegalPage documentKey="privacy" />
      ) : path === '/legal/cookies' ? (
        <LegalPage documentKey="cookies" />
      ) : path === '/legal/terminos' ? (
        <LegalPage documentKey="terms" />
      ) : path === '/cuenta' ? (
        <AccountPage />
      ) : path === '/calendario' ? (
        <CalendarPage />
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
    </>
  </StrictMode>,
);