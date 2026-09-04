import { useState } from 'react';

type ShareChannel = 'native' | 'whatsapp' | 'copy';

type GrowthEventName = 'share_started' | 'share_completed';

type GrowthEventDetail = {
  event: GrowthEventName;
  channel: ShareChannel;
  route: string;
};

const PUBLIC_SHARE_ROUTES = [
  '/magina/mercado',
  '/magina/directorio',
  '/magina/noticias',
  '/magina/tiempo',
  '/magina/campo',
  '/magina',
] as const;

const SHARE_SOURCE: Record<ShareChannel, string> = {
  native: 'web_share',
  whatsapp: 'whatsapp',
  copy: 'copy_link',
};

function currentPublicRoute(): string {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const route = PUBLIC_SHARE_ROUTES.find((candidate) => pathname.endsWith(candidate));
  if (!route) throw new Error('Public sharing is only available on approved public routes.');
  return route;
}

function canonicalPublicUrl(): URL {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const url = new URL(canonical || window.location.href, window.location.origin);
  const route = currentPublicRoute();

  if (!url.pathname.replace(/\/$/, '').endsWith(route)) {
    throw new Error('Canonical URL does not match the current approved public route.');
  }

  url.search = '';
  url.hash = '';
  return url;
}

function trackedPublicUrl(channel: ShareChannel): string {
  const url = canonicalPublicUrl();
  url.searchParams.set('utm_source', SHARE_SOURCE[channel]);
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', 'magina_public_growth');
  return url.toString();
}

function publicSharePayload(channel: ShareChannel) {
  const title = document.title || 'Mágina Olivo';
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content
    || 'Información útil del olivar y Sierra Mágina.';

  return {
    title,
    text: description,
    url: trackedPublicUrl(channel),
  };
}

function emitGrowthEvent(event: GrowthEventName, channel: ShareChannel) {
  const detail: GrowthEventDetail = {
    event,
    channel,
    route: currentPublicRoute(),
  };
  window.dispatchEvent(new CustomEvent<GrowthEventDetail>('magina:public-growth-event', { detail }));
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy failed');
}

export function PublicShare() {
  const [notice, setNotice] = useState('');

  async function nativeShare() {
    const payload = publicSharePayload('native');
    if (!navigator.share) {
      await copyLink();
      return;
    }

    emitGrowthEvent('share_started', 'native');
    try {
      await navigator.share(payload);
      emitGrowthEvent('share_completed', 'native');
      setNotice('Enlace preparado para compartir.');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setNotice('No se ha podido abrir el menú de compartir.');
    }
  }

  function shareWhatsApp() {
    const payload = publicSharePayload('whatsapp');
    emitGrowthEvent('share_started', 'whatsapp');
    const message = `${payload.title}\n${payload.text}\n${payload.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    const payload = publicSharePayload('copy');
    emitGrowthEvent('share_started', 'copy');
    try {
      await copyText(payload.url);
      emitGrowthEvent('share_completed', 'copy');
      setNotice('Enlace copiado.');
    } catch {
      setNotice('No se ha podido copiar el enlace.');
    }
  }

  return (
    <aside className="public-share" aria-label="Compartir información pública">
      <div className="public-share-actions">
        <button
          className="public-share-primary"
          type="button"
          onClick={() => void nativeShare()}
          data-growth-event="share_started"
        >
          Compartir
        </button>
        <button type="button" onClick={shareWhatsApp} data-growth-event="share_started" data-growth-channel="whatsapp">
          WhatsApp
        </button>
        <button type="button" onClick={() => void copyLink()} data-growth-event="share_started" data-growth-channel="copy">
          Copiar enlace
        </button>
      </div>
      <p className="public-share-note">Solo se comparte esta página pública; nunca tus fincas, campañas ni documentos.</p>
      <span className="public-share-status" role="status" aria-live="polite">{notice}</span>
    </aside>
  );
}
