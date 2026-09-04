import { useEffect, useState } from 'react';

type LegalKey = 'privacy' | 'cookies' | 'terms';

type LegalDocument = {
  id: string;
  documentKey: LegalKey;
  version: string;
  title: string;
  contentText: string;
  effectiveAt: string | null;
};

const labels: Record<LegalKey, string> = {
  privacy: 'Privacidad',
  cookies: 'Cookies',
  terms: 'Términos y condiciones',
};

export function LegalPage({ documentKey }: { documentKey: LegalKey }) {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/public/legal/${documentKey}`, { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 404) {
          setState('missing');
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const value = await response.json() as LegalDocument;
        if (active) {
          setDocument(value);
          setState('ready');
        }
      })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [documentKey]);

  return (
    <main className="legal-page">
      <header className="public-form-header">
        <a href="/" className="public-back-link">← Mágina Olivo</a>
        <p className="public-eyebrow">Información legal</p>
        <h1>{labels[documentKey]}</h1>
      </header>

      {state === 'loading' ? <section className="legal-card" role="status">Cargando documento…</section> : null}
      {state === 'missing' ? (
        <section className="legal-card">
          <h2>Documento todavía no publicado</h2>
          <p>Esta sección se encuentra preparada, pero todavía no existe una versión activa publicada.</p>
          <p>Antes de producción deberá existir un texto revisado y activado desde el panel de administración.</p>
        </section>
      ) : null}
      {state === 'error' ? <section className="legal-card" role="alert">No se ha podido cargar el documento.</section> : null}
      {state === 'ready' && document ? (
        <article className="legal-card">
          <div className="legal-meta">
            <span>Versión {document.version}</span>
            <span>{document.effectiveAt ? `Vigente desde ${new Date(document.effectiveAt).toLocaleDateString('es-ES')}` : 'Fecha de vigencia no indicada'}</span>
          </div>
          <h2>{document.title}</h2>
          <div className="legal-copy">{document.contentText.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        </article>
      ) : null}

      <nav className="legal-nav" aria-label="Documentos legales">
        <a href="/legal/privacidad">Privacidad</a>
        <a href="/legal/cookies">Cookies</a>
        <a href="/legal/terminos">Términos</a>
        <a href="/contacto">Contacto</a>
      </nav>
    </main>
  );
}
