import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ConnectivityStatus } from './ConnectivityStatus';
import { MaginaDirectoryPage } from './MaginaDirectoryPage';
import { MaginaHubPage } from './MaginaHubPage';
import { MaginaMarketPage } from './MaginaMarketPage';
import { MaginaWeatherPage } from './MaginaWeatherPage';
import { NoticeCenter } from './NoticeCenter';
import { ResetPassword } from './ResetPassword';
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
import './integration-v2.css';
import './field-v2-integration.css';
import './journal-v2-integration.css';
import './campaign-v2-integration.css';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('Mágina Olivo app shell is available offline.');
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const path = window.location.pathname;

createRoot(root).render(
  <StrictMode>
    {path === '/reset-password' ? (
      <ResetPassword />
    ) : path === '/magina' ? (
      <MaginaHubPage />
    ) : path === '/magina/directorio' ? (
      <MaginaDirectoryPage />
    ) : path === '/magina/tiempo' ? (
      <MaginaWeatherPage />
    ) : path === '/magina/mercado' ? (
      <MaginaMarketPage />
    ) : (
      <>
        <ConnectivityStatus />
        <NoticeCenter />
        <App />
      </>
    )}
  </StrictMode>,
);