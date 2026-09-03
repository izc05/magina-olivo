import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ConnectivityStatus } from './ConnectivityStatus';
import { NoticeCenter } from './NoticeCenter';
import { ResetPassword } from './ResetPassword';
import './styles.css';
import './connectivity.css';
import './navigation-v2.css';
import './notices.css';
import './field-notebook.css';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('Mágina Olivo app shell is available offline.');
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    {window.location.pathname === '/reset-password' ? (
      <ResetPassword />
    ) : (
      <>
        <ConnectivityStatus />
        <NoticeCenter />
        <App />
      </>
    )}
  </StrictMode>,
);
