import { useState } from 'react';

type ShareChannel = 'native' | 'whatsapp' | 'copy';

type GrowthEventDetail = {
  event: 'share_started';
  channel: ShareChannel;
  route: string;
};

function publicSharePayload() {
  const title = document.title || 'Mágina Olivo';
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content
    || 'Información útil del olivar y Sierra Mágina.';
  const url = new URL(window.location.href);
  url.hash = '';

  return {
    title,
    text: description,
    url: url.toString(),
  };
}

function emitGrowthEvent(channel: ShareChannel) {
  const detail: GrowthEventDetail = {
    event: 'share_started',
    channel,
    route: window.location.pathname,
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
    const payload = publicSharePayload();
    if (!navigator.share) {
      await copyLink();
      return;
    }

    emitGrowthEvent('native');
    try {
      await navigator.share(payload);
      setNotice('Enlace preparado para compartir.');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setNotice('No se ha podido abrir el menú de compartir.');
    }
  }

  function shareWhatsApp() {
    const payload = publicSharePayload();
    emitGrowthEvent('whatsapp');
    const message = `${payload.title}\n${payload.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    const payload = publicSharePayload();
    emitGrowthEvent('copy');
    try {
      await copyText(payload.url);
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
