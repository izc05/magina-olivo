import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'magina-pwa-install-dismissed-until';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isIos(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function wasDismissedRecently(): boolean {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_FOR_MS));
  } catch {
    // Private browsing may block storage. The prompt remains usable in that case.
  }
}

/**
 * Uses the browser's real install event on Android/Chromium. iOS does not expose
 * that event, so it receives an honest, short “Share → Add to Home Screen” guide.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShow(true);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIosGuideOpen(false);
      setShow(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    if (isIos()) setShow(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  function dismiss(): void {
    rememberDismissal();
    setIosGuideOpen(false);
    setShow(false);
  }

  async function install(): Promise<void> {
    if (isIos()) {
      setIosGuideOpen(true);
      return;
    }
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setShow(false);
      else rememberDismissal();
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  if (!show || (isIos() ? false : !deferredPrompt)) return null;

  return (
    <section className="pwa-install-prompt" aria-label="Instalar Mágina Olivo" role="status" aria-live="polite">
      <div className="pwa-install-mark" aria-hidden="true"><Download size={19} /></div>
      <div className="pwa-install-copy">
        <strong>Ten Mágina Olivo siempre a mano</strong>
        <span>Instálala en tu móvil para abrirla como una aplicación.</span>
      </div>
      <button className="pwa-install-action" type="button" onClick={() => void install()} disabled={installing}>
        {installing ? 'Abriendo…' : 'Instalar'}
      </button>
      <button className="pwa-install-dismiss" type="button" aria-label="Cerrar aviso de instalación" onClick={dismiss} disabled={installing}><X size={17} aria-hidden="true" /></button>

      {iosGuideOpen ? (
        <div className="pwa-ios-guide" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
          <div className="pwa-ios-guide-icon" aria-hidden="true"><Share size={23} /></div>
          <div>
            <strong id="ios-install-title">Instala Mágina Olivo en tu iPhone</strong>
            <p>En Safari, pulsa <b>Compartir</b> y elige <b>“Añadir a pantalla de inicio”</b>. Después se abrirá sin la barra del navegador.</p>
          </div>
          <button type="button" className="pwa-ios-guide-close" onClick={() => setIosGuideOpen(false)}>Entendido</button>
        </div>
      ) : null}
    </section>
  );
}
